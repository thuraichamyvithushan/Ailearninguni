import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mode, firebaseAuth } from "../config/firebase.js";
import { store } from "../services/store.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/schemas.js";
import { assert, asyncRoute as run } from "../utils/errors.js";
import * as auth from "../controllers/auth.js";
import * as courses from "../controllers/courses.js";
import { getCurriculum, issueCertificate } from "../services/learning.js";
const router = Router();
router.get(
  "/admin/courses",
  run(async (_req, res) => res.json(await store.list("courses"))),
);
router.get(
  "/admin/courses/:id",
  run(async (req, res) => {
    const course = await store.get("courses", req.params.id);
    assert(course, 404, "Course not found.");
    res.json({ ...course, modules: await getCurriculum(store, course.id) });
  }),
);
router.post(
  "/admin/courses",
  validate(schemas.course),
  run(courses.createCourse),
);
router.put(
  "/admin/courses/:id",
  validate(schemas.course),
  run(courses.updateCourse),
);
router.delete("/admin/courses/:id", run(courses.deleteCourse));
router.post(
  "/admin/courses/:courseId/modules",
  validate(schemas.moduleSchema),
  run(async (req, res) => {
    const id = randomUUID();
    await store.transaction(async (db) => {
      assert(
        await db.get("courses", req.params.courseId),
        404,
        "Course not found.",
      );
      await db.put(`courses/${req.params.courseId}/modules`, id, {
        ...req.body,
        courseId: req.params.courseId,
      });
      await db.put("moduleLookup", id, { courseId: req.params.courseId });
    });
    res.status(201).json({ ...req.body, id });
  }),
);
async function findModule(db, id) {
  const found = await db.get("moduleLookup", id);
  if (found) return found;
  for (const c of await db.list("courses"))
    if (await db.get(`courses/${c.id}/modules`, id)) return { courseId: c.id };
  assert(false, 404, "Module not found.");
}
router.put(
  "/admin/modules/:id",
  validate(schemas.moduleSchema),
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const m = await findModule(db, req.params.id);
      await db.put(`courses/${m.courseId}/modules`, req.params.id, req.body);
    });
    res.json({ success: true });
  }),
);
router.delete(
  "/admin/modules/:id",
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const m = await findModule(db, req.params.id);
      assert(
        !(await db.list("enrollments")).some((e) => e.courseId === m.courseId),
        409,
        "Unpublish or create a new course version before removing modules with student progress.",
      );
      const lessons = await db.list(
        `courses/${m.courseId}/modules/${req.params.id}/lessons`,
      );
      const quizzes = await db.list("quizzes");
      for (const l of lessons) {
        await db.delete(
          `courses/${m.courseId}/modules/${req.params.id}/lessons`,
          l.id,
        );
        await db.delete("lessonLookup", l.id);
        for (const q of quizzes.filter((q) => q.lessonId === l.id))
          await db.delete("quizzes", q.id);
      }
      await db.delete(`courses/${m.courseId}/modules`, req.params.id);
      await db.delete("moduleLookup", req.params.id);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/admin/modules/:moduleId/lessons",
  validate(schemas.lesson),
  run(async (req, res) => {
    const id = randomUUID();
    await store.transaction(async (db) => {
      const module = await findModule(db, req.params.moduleId);
      await db.put(
        `courses/${module.courseId}/modules/${req.params.moduleId}/lessons`,
        id,
        {
          ...req.body,
          moduleId: req.params.moduleId,
          courseId: module.courseId,
        },
      );
      await db.put("lessonLookup", id, {
        ...module,
        moduleId: req.params.moduleId,
      });
    });
    res.status(201).json({ ...req.body, id });
  }),
);
router.put(
  "/admin/lessons/:id",
  validate(schemas.lesson),
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const l = await db.get("lessonLookup", req.params.id);
      assert(l, 404, "Lesson not found.");
      await db.put(
        `courses/${l.courseId}/modules/${l.moduleId}/lessons`,
        req.params.id,
        req.body,
      );
    });
    res.json({ success: true });
  }),
);
router.delete(
  "/admin/lessons/:id",
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const l = await db.get("lessonLookup", req.params.id);
      assert(l, 404, "Lesson not found.");
      assert(
        !(await db.list("enrollments")).some((e) => e.courseId === l.courseId),
        409,
        "Lessons with enrolled students cannot be deleted.",
      );
      const quizzes = await db.list("quizzes");
      await db.delete(
        `courses/${l.courseId}/modules/${l.moduleId}/lessons`,
        req.params.id,
      );
      await db.delete("lessonLookup", req.params.id);
      for (const q of quizzes.filter((q) => q.lessonId === req.params.id))
        await db.delete("quizzes", q.id);
    });
    res.json({ success: true });
  }),
);
router.get(
  "/admin/students",
  run(async (_req, res) =>
    res.json(
      (await store.list("users", { role: "student" })).map(auth.publicUser),
    ),
  ),
);
router.get(
  "/admin/students/:id",
  run(async (req, res) => {
    const u = await store.get("users", req.params.id);
    assert(u?.role === "student", 404, "Student not found.");
    const details = { ...auth.publicUser(u) };
    for (const key of [
      "enrollments",
      "lessonProgress",
      "quizAttempts",
      "projects",
      "certificates",
      "activityLogs",
    ])
      details[key] = (await store.list(key)).filter((r) => r.userId === u.id);
    res.json(details);
  }),
);
router.put(
  "/admin/students/:id/learning-path",
  validate(z.object({ learningPathId: z.string().max(200) })),
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const student = await db.get("users", req.params.id);
      assert(student?.role === "student", 400, "Choose a student.");
      const pathId = req.body.learningPathId;
      if (pathId)
        assert(
          await db.get("learningPaths", pathId),
          404,
          "Learning path not found.",
        );
      await db.put("users", student.id, {
        learningPathId: pathId,
        learningPathAssignedBy: pathId ? req.user.uid : "",
        learningPathAssignedAt: pathId ? new Date().toISOString() : null,
      });
    });
    res.json(auth.publicUser(await store.get("users", req.params.id)));
  }),
);
router.put(
  "/admin/students/:id",
  validate(
    z.object({
      status: z.enum(["active", "suspended"]).optional(),
      role: z.enum(["student", "instructor", "admin", "superadmin"]).optional(),
    }),
  ),
  run(async (req, res) => {
    assert(
      req.params.id !== req.user.uid,
      400,
      "You cannot change your own role or suspend yourself.",
    );
    if (req.body.role)
      assert(
        req.user.role === "superadmin",
        403,
        "Only a superadmin can change roles.",
      );
    const u = await store.get("users", req.params.id);
    assert(u, 404, "User not found.");
    assert(
      !["admin", "superadmin"].includes(u.role) ||
        req.user.role === "superadmin",
      403,
      "Only a superadmin can change administrator accounts.",
    );
    if (mode === "firebase") {
      if (req.body.role) {
        const record = await firebaseAuth.getUser(u.id);
        await firebaseAuth.setCustomUserClaims(u.id, {
          ...record.customClaims,
          role: req.body.role,
        });
        await firebaseAuth.revokeRefreshTokens(u.id);
      }
      if (req.body.status)
        await firebaseAuth.updateUser(u.id, {
          disabled: req.body.status === "suspended",
        });
    }
    await store.transaction((db) => db.put("users", u.id, req.body));
    res.json(auth.publicUser(await store.get("users", u.id)));
  }),
);
router.post(
  "/admin/enrollments",
  validate(
    z.object({ userId: z.string().min(1), courseId: z.string().min(1) }),
  ),
  run(async (req, res) => {
    const u = await store.get("users", req.body.userId);
    assert(u?.role === "student", 400, "Choose a student.");
    req.user = { ...req.user, uid: u.id };
    req.params.courseId = req.body.courseId;
    await courses.enroll(req, res);
  }),
);
router.delete(
  "/admin/enrollments/:id",
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const e = await db.get("enrollments", req.params.id);
      assert(e, 404, "Enrollment not found.");
      await db.delete("enrollments", e.id);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/admin/enrollments/:id/reset",
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const e = await db.get("enrollments", req.params.id);
      assert(e, 404, "Enrollment not found.");
      const modules = await getCurriculum(db, e.courseId);
      const progress = await db.list("lessonProgress");
      const attempts = await db.list("quizAttempts");
      const certificates = await db.list("certificates");
      const visits = await db.list("lessonVisits", { userId: e.userId });
      const exercises = await db.list("exerciseSubmissions", {
        userId: e.userId,
      });
      const lessonIds = new Set(
        modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
      );
      await db.put("enrollments", e.id, {
        progress: 0,
        status: "Not Started",
        completedAt: null,
        currentLessonId: modules[0]?.lessons[0]?.id || "",
      });
      for (const p of progress.filter(
        (p) => p.userId === e.userId && p.courseId === e.courseId,
      ))
        await db.delete("lessonProgress", p.id);
      for (const a of attempts.filter(
        (a) => a.userId === e.userId && a.courseId === e.courseId,
      ))
        await db.delete("quizAttempts", a.id);
      for (const c of certificates.filter(
        (c) => c.userId === e.userId && c.courseId === e.courseId,
      ))
        await db.put("certificates", c.id, { valid: false });
      for (const visit of visits.filter((visit) =>
        lessonIds.has(visit.lessonId),
      ))
        await db.delete("lessonVisits", visit.id);
      for (const exercise of exercises.filter((exercise) =>
        lessonIds.has(exercise.lessonId),
      ))
        await db.delete("exerciseSubmissions", exercise.id);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/admin/certificates",
  validate(
    z.object({ userId: z.string().min(1), courseId: z.string().min(1) }),
  ),
  run(async (req, res) =>
    res
      .status(201)
      .json(
        await store.transaction((db) =>
          issueCertificate(db, req.body.userId, req.body.courseId),
        ),
      ),
  ),
);
router.get(
  "/admin/analytics",
  run(async (_req, res) => {
    const users = await store.list("users");
    const students = users.filter((u) => u.role === "student");
    const enrollments = await store.list("enrollments");
    const courses = await store.list("courses");
    const certificates = await store.list("certificates");
    res.json({
      students: students.length,
      active: students.filter((s) => s.status === "active").length,
      courses: courses.length,
      enrollments: enrollments.length,
      completionRate: enrollments.length
        ? Math.round(
            (enrollments.filter((e) => e.status === "Completed").length /
              enrollments.length) *
              100,
          )
        : 0,
      certificates: certificates.length,
      recent: students.slice(-5).reverse().map(auth.publicUser),
      popular: courses.map((c) => ({
        title: c.title,
        enrollments: enrollments.filter((e) => e.courseId === c.id).length,
        completed: enrollments.filter(
          (e) => e.courseId === c.id && e.status === "Completed",
        ).length,
      })),
      growth: Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - 5 + i);
        const month = date.toISOString().slice(0, 7);
        return {
          month,
          count: students.filter((s) => s.createdAt?.startsWith(month)).length,
        };
      }),
    });
  }),
);
for (const collection of [
  "categories",
  "learningPaths",
  "quizzes",
  "projects",
  "certificates",
  "instructors",
  "packages",
  "enrollments",
  "supportRequests",
])
  router.get(
    `/admin/${collection}`,
    run(async (_req, res) => res.json(await store.list(collection))),
  );
for (const [collection, schema] of [
  [
    "categories",
    z.object({
      name: z.string().min(1).max(200),
      color: z.string().max(50).default("violet"),
    }),
  ],
  [
    "learningPaths",
    z.object({
      title: z.string().min(1).max(200),
      profession: z.string().min(1).max(200),
      skillLevel: z.string().min(1).max(100),
      goal: z.string().min(1).max(200),
      description: z.string().max(5000).default(""),
      courseIds: z.array(z.string().min(1)).min(1),
    }),
  ],
  ["quizzes", schemas.quiz],
  [
    "instructors",
    z.object({
      name: z.string().min(1).max(200),
      email: z.string().email(),
      title: z.string().max(500),
    }),
  ],
  [
    "packages",
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000),
      price: z.number().min(0),
      active: z.boolean(),
    }),
  ],
]) {
  const save = run(async (req, res) => {
    const id = req.params.id || randomUUID();
    await store.transaction(async (db) => {
      if (req.params.id)
        assert(await db.get(collection, id), 404, "Record not found.");
      if (collection === "quizzes") {
        const lookup = await db.get("lessonLookup", req.body.lessonId);
        assert(
          lookup?.courseId === req.body.courseId,
          400,
          "Quiz lesson must belong to this course.",
        );
        assert(
          (
            await db.get(
              `courses/${lookup.courseId}/modules/${lookup.moduleId}/lessons`,
              req.body.lessonId,
            )
          )?.type === "quiz",
          400,
          "Choose a quiz lesson.",
        );
        assert(
          !(await db.list("quizzes")).some(
            (q) => q.id !== id && q.lessonId === req.body.lessonId,
          ),
          409,
          "This lesson already has a quiz.",
        );
      }
      if (collection === "learningPaths") {
        const catalog = await db.list("courses");
        assert(
          req.body.courseIds.every((id) => catalog.some((c) => c.id === id)),
          400,
          "Learning path contains an unknown course.",
        );
      }
      await db.put(collection, id, req.body);
    });
    res.json({ ...req.body, id });
  });
  router.post(`/admin/${collection}`, validate(schema), save);
  router.put(`/admin/${collection}/:id`, validate(schema), save);
  router.delete(
    `/admin/${collection}/:id`,
    run(async (req, res) => {
      await store.transaction(async (db) => {
        assert(
          await db.get(collection, req.params.id),
          404,
          "Record not found.",
        );
        if (collection === "quizzes")
          assert(
            !(await db.list("quizAttempts")).some(
              (a) => a.quizId === req.params.id,
            ),
            409,
            "Quizzes with attempts cannot be deleted.",
          );
        await db.delete(collection, req.params.id);
      });
      res.json({ success: true });
    }),
  );
}
router.get(
  "/admin/settings",
  run(async (_req, res) =>
    res.json(
      (await store.get("settings", "platform")) || {
        name: "Ai Learning Uni",
        supportEmail: "hello@aiatlas.example",
        certificateEnabled: true,
      },
    ),
  ),
);
router.put(
  "/admin/settings",
  validate(
    z.object({
      name: z.string().min(1).max(200),
      supportEmail: z.string().email(),
      certificateEnabled: z.boolean(),
    }),
  ),
  run(async (req, res) => {
    await store.transaction((db) => db.put("settings", "platform", req.body));
    res.json(req.body);
  }),
);

export default router;
