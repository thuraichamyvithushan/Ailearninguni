import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
let server, base, admin, student, folder;
let courseId,
  moduleId,
  firstLesson,
  exerciseLesson,
  quizLesson,
  quizId,
  userId,
  certificateId;
async function request(path, { token, body, method = "GET" } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data };
}
before(async () => {
  folder = await mkdtemp(join(tmpdir(), "atlas-test-"));
  process.env.AUTH_MODE = "demo";
  process.env.DEMO_DATA_FILE = join(folder, "demo.json");
  process.env.UPLOADS_DIR = join(folder, "uploads");
  const { app } = await import("../src/app.js");
  const { seed } = await import("../src/utils/seed.js");
  await seed();
  server = app.listen(0, "localhost");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${server.address().port}/api`;
  admin = (
    await request("/auth/login", {
      method: "POST",
      body: { email: "admin@aiatlas.demo", password: "AtlasDemo2026!" },
    })
  ).data.token;
  const registered = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Test Learner",
      email: "test@example.com",
      password: "SecureTest123!",
      role: "superadmin",
    },
  });
  student = registered.data.token;
  userId = registered.data.user.id;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (folder) await rm(folder, { recursive: true, force: true });
});
test("public catalog and health are available", async () => {
  assert.equal((await request("/health")).data.authMode, "demo");
  assert.equal((await request("/courses")).data.length, 6);
});

test("CORS supports local and Vercel frontends and authenticated preflight", async () => {
  for (const origin of [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "https://ailearninguni.vercel.app",
  ]) {
    const response = await fetch(base + "/health", {
      headers: { Origin: origin },
    });
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
  const preflight = await fetch(base + "/me", {
    method: "OPTIONS",
    headers: {
      Origin: "https://ailearninguni.vercel.app",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.match(
    preflight.headers.get("access-control-allow-headers"),
    /authorization/,
  );
  const unlisted = await fetch(base + "/health", {
    headers: { Origin: "https://unlisted.example" },
  });
  assert.equal(unlisted.headers.get("access-control-allow-origin"), null);
});
test("registration cannot assign an admin role", async () => {
  const me = await request("/me", { token: student });
  assert.equal(me.data.role, "student");
  assert.equal(me.data.passwordHash, undefined);
});
test("server rejects unauthenticated, forged, and student admin access", async () => {
  assert.equal((await request("/admin/courses")).status, 401);
  assert.equal(
    (await request("/admin/courses", { token: "forged" })).status,
    401,
  );
  assert.equal(
    (await request("/admin/courses", { token: student })).status,
    403,
  );
});
test("profile updates cannot elevate roles", async () => {
  await request("/me", {
    token: student,
    method: "PUT",
    body: { name: "Test Learner", role: "superadmin" },
  });
  assert.equal((await request("/me", { token: student })).data.role, "student");
});
test("onboarding saves preferences without assigning a learning path", async () => {
  const r = await request("/onboarding", {
    token: student,
    method: "POST",
    body: {
      profession: "Marketing",
      aiLevel: "Beginner",
      goal: "Create content",
      learningStyle: "Self-paced",
      weeklyStudyTime: "2–5 hours",
      learningPathId: "path-marketing",
      learningPathAssignedBy: "demo-admin",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.learningPathId, undefined);
  assert.equal(
    (await request("/learning-path", { token: student })).data,
    null,
  );
  const profile = (await request("/me", { token: student })).data;
  assert.equal(profile.onboardingCompleted, true);
  assert.equal(profile.learningPathAssignedBy, undefined);
});
test("admins assign paths; students cannot self-assign or overwrite an assignment", async () => {
  const manager = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Path Manager",
      email: "path-manager@example.com",
      password: "SecureTest123!",
    },
  });
  await request(`/admin/students/${manager.data.user.id}`, {
    token: admin,
    method: "PUT",
    body: { role: "admin" },
  });
  const managerSession = await request("/auth/login", {
    method: "POST",
    body: { email: "path-manager@example.com", password: "SecureTest123!" },
  });
  const managerToken = managerSession.data.token;
  const endpoint = `/admin/students/${userId}/learning-path`;
  assert.equal(
    (
      await request(endpoint, {
        token: student,
        method: "PUT",
        body: { learningPathId: "path-marketing" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(endpoint, {
        token: managerToken,
        method: "PUT",
        body: { learningPathId: "missing-path" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(endpoint, {
        token: managerToken,
        method: "PUT",
        body: { learningPathId: "path-marketing" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/learning-path", { token: student })).data.courses.length,
    3,
  );
  await request("/onboarding", {
    token: student,
    method: "POST",
    body: {
      profession: "Technology",
      aiLevel: "Advanced",
      goal: "Build AI applications",
      learningStyle: "Self-paced",
      weeklyStudyTime: "2–5 hours",
      learningPathId: "path-technology",
      learningPathAssignedBy: "forged",
    },
  });
  const profile = (await request("/me", { token: student })).data;
  assert.equal(profile.learningPathId, "path-marketing");
  assert.equal(profile.learningPathAssignedBy, manager.data.user.id);
  assert.equal(
    (await request("/learning-path", { token: student })).data.id,
    "path-marketing",
  );
  assert.equal(
    (
      await request(`/admin/students/demo-admin/learning-path`, {
        token: managerToken,
        method: "PUT",
        body: { learningPathId: "path-marketing" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(endpoint, {
        token: managerToken,
        method: "PUT",
        body: { learningPathId: "" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/learning-path", { token: student })).data,
    null,
  );
});
test("public homepage data hides draft courses, inactive packages, and instructor emails", async () => {
  const catalog = await request("/courses");
  assert(
    catalog.data.every((course) => course.published && course.categoryName),
  );
  const instructors = await request("/instructors");
  assert(instructors.data.length);
  assert(instructors.data.every((instructor) => !("email" in instructor)));
  const { store } = await import("../src/services/store.js");
  const course = await store.get("courses", "ai-foundations");
  const packageId = "hidden-package-test";
  await store.transaction(async (db) => {
    await db.put("courses", course.id, { published: false });
    await db.put("packages", packageId, {
      name: "Hidden",
      price: 0,
      active: false,
    });
    await db.put("learningPaths", "hidden-path-test", {
      title: "Draft-only path",
      courseIds: [course.id],
    });
  });
  try {
    const paths = (await request("/learning-paths")).data;
    assert(!paths.some((path) => path.id === "hidden-path-test"));
    assert(
      paths.every((path) =>
        path.courses.every((item) => item.published && item.id !== course.id),
      ),
    );
    assert(
      paths.every((path) =>
        path.courseIds.every((id) =>
          path.courses.some((item) => item.id === id),
        ),
      ),
    );
    assert(
      !(await request("/packages")).data.some((item) => item.id === packageId),
    );
  } finally {
    await store.transaction(async (db) => {
      await db.put("courses", course.id, { published: true });
      await db.delete("packages", packageId);
      await db.delete("learningPaths", "hidden-path-test");
    });
  }
});
test("admin course CRUD validates slugs and creates a curriculum", async () => {
  const body = {
    title: "Integration course",
    slug: "integration-course",
    shortDescription: "A small course that verifies end-to-end learning.",
    description: "Test",
    categoryId: "other",
    instructorId: "instructor-samara",
    level: "Beginner",
    duration: "30 min",
    price: 0,
    published: true,
    featured: false,
    sequentialLearning: true,
    certificateEnabled: true,
    projectRequired: true,
  };
  const invalid = await request("/admin/courses", {
    token: admin,
    method: "POST",
    body: { ...body, slug: "invalid slug" },
  });
  assert.equal(invalid.status, 400);
  const course = await request("/admin/courses", {
    token: admin,
    method: "POST",
    body,
  });
  assert.equal(course.status, 201);
  courseId = course.data.id;
  assert.equal(
    (
      await request(`/admin/courses/${courseId}`, {
        token: admin,
        method: "PUT",
        body,
      })
    ).status,
    200,
  );
  const otherCourse = (
    await request("/admin/courses", { token: admin })
  ).data.find((row) => row.id !== courseId);
  const conflict = await request(`/admin/courses/${courseId}`, {
    token: admin,
    method: "PUT",
    body: { ...body, slug: otherCourse.slug },
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error, "That course slug is already in use.");
  assert.equal(
    (await request(`/admin/courses/${courseId}`, { token: admin })).data.slug,
    body.slug,
  );
  assert.equal(
    (await request("/admin/courses", { token: admin, method: "POST", body }))
      .status,
    409,
  );
  const module = await request(`/admin/courses/${courseId}/modules`, {
    token: admin,
    method: "POST",
    body: { title: "Module one", description: "Learning", order: 0 },
  });
  moduleId = module.data.id;
  for (const [type, title, order, unlockRule] of [
    ["text", "First step", 0, "opened"],
    ["exercise", "Practice", 1, "exerciseSubmitted"],
    ["quiz", "Check", 2, "quizPassed"],
  ]) {
    const l = await request(`/admin/modules/${moduleId}/lessons`, {
      token: admin,
      method: "POST",
      body: {
        title,
        type,
        order,
        unlockRule,
        content: "A useful learning idea.",
        duration: 1,
        required: true,
        preview: order === 0,
      },
    });
    assert.equal(l.status, 201);
    if (order === 0) firstLesson = l.data.id;
    if (order === 1) exerciseLesson = l.data.id;
    if (order === 2) quizLesson = l.data.id;
  }
  const q = await request("/admin/quizzes", {
    token: admin,
    method: "POST",
    body: {
      courseId,
      lessonId: quizLesson,
      title: "Check knowledge",
      passingPercentage: 100,
      maxAttempts: 2,
      randomize: false,
      showExplanation: true,
      questions: [
        {
          id: "question1",
          type: "multiple-select",
          question: "Select both responsible practices.",
          options: ["Review output", "Protect data", "Publish without review"],
          correctAnswers: [0, 1],
          explanation: "Review and protect.",
          points: 2,
        },
      ],
    },
  });
  assert.equal(q.status, 200);
  quizId = q.data.id;
});
test("public course detail hides non-preview content and quiz solutions", async () => {
  const c = (await request(`/courses/${courseId}`)).data;
  assert.equal(c.modules[0].lessons[1].content, undefined);
  assert.equal(c.modules[0].lessons[2].quiz, undefined);
});
test("enrollment is idempotent and required before learning", async () => {
  assert.equal(
    (await request(`/courses/${courseId}/progress`, { token: student })).status,
    403,
  );
  const a = await request(`/courses/${courseId}/enroll`, {
    token: student,
    method: "POST",
  });
  const b = await request(`/courses/${courseId}/enroll`, {
    token: student,
    method: "POST",
  });
  assert.equal(a.data.id, b.data.id);
});
test("locked lessons conceal content and cannot be completed", async () => {
  const c = (await request(`/courses/${courseId}/progress`, { token: student }))
    .data;
  assert.equal(c.modules[0].lessons[1].locked, true);
  assert.equal(c.modules[0].lessons[1].content, undefined);
  assert.equal(
    (
      await request(`/lessons/${exerciseLesson}/complete`, {
        token: student,
        method: "POST",
        body: {
          exercise:
            "A sufficiently long response that still cannot skip lessons.",
        },
      })
    ).status,
    403,
  );
});
test("an opened lesson advances server-computed progress", async () => {
  assert.equal(
    (
      await request(`/lessons/${firstLesson}/complete`, {
        token: student,
        method: "POST",
        body: {},
      })
    ).status,
    400,
  );
  await request(`/lessons/${firstLesson}/open`, {
    token: student,
    method: "POST",
  });
  const r = await request(`/lessons/${firstLesson}/complete`, {
    token: student,
    method: "POST",
    body: {},
  });
  assert.equal(r.data.progress, 33);
});
test("exercise requirements cannot be bypassed by the frontend", async () => {
  await request(`/lessons/${exerciseLesson}/open`, {
    token: student,
    method: "POST",
  });
  assert.equal(
    (
      await request(`/lessons/${exerciseLesson}/complete`, {
        token: student,
        method: "POST",
        body: { exercise: "short" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/lessons/${exerciseLesson}/complete`, {
        token: student,
        method: "POST",
        body: {
          exercise:
            "A structured prompt with a clear role, context, task, and output format.",
        },
      })
    ).data.progress,
    67,
  );
});
test("quiz answers remain private and grading enforces attempts and full selection", async () => {
  const c = (await request(`/courses/${courseId}/progress`, { token: student }))
    .data;
  assert.equal(
    c.modules[0].lessons[2].quiz.questions[0].correctAnswers,
    undefined,
  );
  const fail = await request(`/quizzes/${quizId}/submit`, {
    token: student,
    method: "POST",
    body: { answers: { question1: [0] } },
  });
  assert.equal(fail.data.passed, false);
  const pass = await request(`/quizzes/${quizId}/submit`, {
    token: student,
    method: "POST",
    body: { answers: { question1: [0, 1] } },
  });
  assert.equal(pass.data.passed, true);
  assert.equal(
    (
      await request(`/quizzes/${quizId}/submit`, {
        token: student,
        method: "POST",
        body: { answers: { question1: [0, 1] } },
      })
    ).status,
    400,
  );
  assert.equal(
    (await request(`/courses/${courseId}/progress`, { token: student })).data
      .enrollment.progress,
    100,
  );
});
test("certificate requires approved project; students cannot review their own work", async () => {
  assert.equal(
    (
      await request(`/courses/${courseId}/certificate`, {
        token: student,
        method: "POST",
      })
    ).status,
    400,
  );
  const p = await request("/projects", {
    token: student,
    method: "POST",
    body: {
      courseId,
      title: "Final practical project",
      description: "A complete demonstration of a practical workflow.",
      promptUsed: "Clear task and context",
      aiOutput: "Reviewed output",
      finalResult:
        "A practical workflow with evaluated results and documented limitations.",
      reflection:
        "I learned to review, refine, and protect sensitive information.",
      status: "Submitted",
    },
  });
  assert.equal(p.status, 200);
  assert.equal(
    (
      await request(`/admin/projects/${p.data.id}/review`, {
        token: student,
        method: "PUT",
        body: { status: "Approved", feedback: "Great work." },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/admin/projects/${p.data.id}/review`, {
        token: admin,
        method: "PUT",
        body: {
          status: "Approved",
          feedback: "A thoughtful and complete project.",
        },
      })
    ).status,
    200,
  );
  const c = await request(`/courses/${courseId}/certificate`, {
    token: student,
    method: "POST",
  });
  assert.equal(c.status, 201);
  certificateId = c.data.id;
  assert.equal(
    (
      await request(`/courses/${courseId}/certificate`, {
        token: student,
        method: "POST",
      })
    ).data.id,
    certificateId,
  );
});
test("certificates verify publicly and render a real downloadable PDF", async () => {
  const publicCertificate = await request(`/certificates/${certificateId}`);
  assert.equal(publicCertificate.data.valid, true);
  assert.equal(publicCertificate.data.userId, undefined);
  const pdf = await request(`/certificates/${certificateId}/pdf`, {
    token: student,
  });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.data.subarray(0, 5).toString(), "%PDF-");
  if (process.env.CERTIFICATE_QA_FILE)
    await writeFile(process.env.CERTIFICATE_QA_FILE, pdf.data);
});
test("saved prompts enforce ownership", async () => {
  const body = {
    title: "Reusable test prompt",
    role: "Educator",
    task: "Design an exercise",
    context: "A class of beginners",
    constraints: "No private data",
    outputFormat: "A list",
    content: "Test prompt content",
  };
  const p = await request("/saved-prompts", {
    token: student,
    method: "POST",
    body,
  });
  assert.equal(p.status, 201);
  const another = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Another Learner",
      email: "another@example.com",
      password: "SecureTest123!",
    },
  });
  assert.equal(
    (
      await request(`/saved-prompts/${p.data.id}`, {
        token: another.data.token,
        method: "PUT",
        body,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/saved-prompts/${p.data.id}`, {
        token: student,
        method: "DELETE",
      })
    ).status,
    200,
  );
});
test("progress reset revokes certificates and clears quiz attempts", async () => {
  assert.equal(
    (
      await request(`/admin/enrollments/${userId}_${courseId}/reset`, {
        token: admin,
        method: "POST",
      })
    ).status,
    200,
  );
  assert.equal((await request(`/certificates/${certificateId}`)).status, 404);
  assert.equal(
    (await request(`/courses/${courseId}/progress`, { token: student })).data
      .enrollment.progress,
    0,
  );
});
test("uploaded lesson resources respect enrollment and lesson locks", async () => {
  async function upload(content, type = "text/plain", name = "lesson.txt") {
    const body = new FormData();
    body.append("file", new Blob([content], { type }), name);
    const response = await fetch(base + "/uploads", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin}` },
      body,
    });
    return { status: response.status, data: await response.json() };
  }
  assert.equal(
    (await upload("not a valid png", "image/png", "invalid.png")).status,
    400,
  );
  const uploaded = await upload("A useful resource for your lesson.");
  assert.equal(uploaded.status, 201);
  await request(`/admin/lessons/${exerciseLesson}`, {
    token: admin,
    method: "PUT",
    body: {
      title: "Practice",
      type: "exercise",
      order: 1,
      unlockRule: "exerciseSubmitted",
      duration: 1,
      required: true,
      resources: [{ name: "Lesson notes", url: uploaded.data.url }],
    },
  });
  assert.equal(
    (await request(uploaded.data.url.replace("/api", ""), { token: student }))
      .status,
    403,
  );
  await request(`/lessons/${firstLesson}/open`, {
    token: student,
    method: "POST",
  });
  await request(`/lessons/${firstLesson}/complete`, {
    token: student,
    method: "POST",
    body: {},
  });
  const file = await request(uploaded.data.url.replace("/api", ""), {
    token: student,
  });
  assert.equal(file.status, 200);
  assert.equal(file.data.toString(), "A useful resource for your lesson.");
});
test("content deletion preserves courses with student records", async () => {
  assert.equal(
    (
      await request(`/admin/courses/${courseId}`, {
        token: admin,
        method: "DELETE",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/modules/${moduleId}`, {
        token: admin,
        method: "DELETE",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/lessons/${firstLesson}`, {
        token: admin,
        method: "DELETE",
      })
    ).status,
    409,
  );
});
test("notifications reflect actual learning activity", async () => {
  const result = await request("/notifications", { token: student });
  assert.equal(result.status, 200);
  assert(result.data.some((n) => n.type === "learning"));
  assert.equal(
    (await request("/notifications/read", { token: student, method: "POST" }))
      .status,
    200,
  );
});
test("instructors can only review submissions for assigned courses", async () => {
  const registration = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Instructor",
      email: "instructor@example.com",
      password: "SecureTest123!",
    },
  });
  const uid = registration.data.user.id;
  await request(`/admin/students/${uid}`, {
    token: admin,
    method: "PUT",
    body: { role: "instructor" },
  });
  const session = await request("/auth/login", {
    method: "POST",
    body: { email: "instructor@example.com", password: "SecureTest123!" },
  });
  const token = session.data.token;
  assert.equal((await request("/admin/courses", { token })).status, 403);
  const project = (
    await request("/admin/projects", { token: admin })
  ).data.find((p) => p.courseId === courseId);
  assert.equal(
    (
      await request(`/admin/projects/${project.id}/review`, {
        token,
        method: "PUT",
        body: { status: "Approved", feedback: "A thoughtful project." },
      })
    ).status,
    403,
  );
  const course = (await request(`/admin/courses/${courseId}`, { token: admin }))
    .data;
  await request(`/admin/courses/${courseId}`, {
    token: admin,
    method: "PUT",
    body: { ...course, instructorId: uid },
  });
  assert.equal(
    (await request("/instructor/projects", { token })).data.length,
    1,
  );
  assert.equal(
    (
      await request(`/admin/projects/${project.id}/review`, {
        token,
        method: "PUT",
        body: { status: "Approved", feedback: "A thoughtful project." },
      })
    ).status,
    200,
  );
});
test("student lists and detail pages exclude administrators and instructors", async () => {
  const { store } = await import("../src/services/store.js");
  const users = await store.list("users");
  const expected = users.filter((user) => user.role === "student");
  const listed = await request("/admin/students", { token: admin });
  assert.equal(listed.status, 200);
  assert.deepEqual(
    listed.data.map((user) => user.id).sort(),
    expected.map((user) => user.id).sort(),
  );
  assert(
    listed.data.every((user) => user.role === "student" && !user.passwordHash),
  );
  assert.equal(
    (await request(`/admin/students/${userId}`, { token: admin })).status,
    200,
  );
  for (const user of users.filter((user) => user.role !== "student")) {
    assert.equal(
      (await request(`/admin/students/${user.id}`, { token: admin })).status,
      404,
    );
  }
});
test("suspended accounts lose API access immediately", async () => {
  assert.equal(
    (
      await request(`/admin/students/${userId}`, {
        token: admin,
        method: "PUT",
        body: { status: "suspended" },
      })
    ).status,
    200,
  );
  assert.equal((await request("/me", { token: student })).status, 403);
  assert(
    (await request("/admin/students", { token: admin })).data.some(
      (user) => user.id === userId && user.status === "suspended",
    ),
  );
});
