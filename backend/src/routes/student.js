import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import multer from "multer";
import PDFDocument from "pdfkit";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mode, firebaseAuth, bucket } from "../config/firebase.js";
import { uploadsDirectory } from "../config/paths.js";
import { store } from "../services/store.js";
import {
  authenticate,
  studentOnly,
  adminOnly,
  roles,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/schemas.js";
import { assert, asyncRoute as run } from "../utils/errors.js";
import * as auth from "../controllers/auth.js";
import * as courses from "../controllers/courses.js";
import {
  completeLesson,
  getCurriculum,
  gradeQuiz,
  issueCertificate,
  lessonContext,
} from "../services/learning.js";
const router = Router();
const sensitive = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

router.get("/me", run(auth.me));
router.put(
  "/me",
  validate(schemas.profile),
  run(async (req, res) => {
    await store.transaction((db) => db.put("users", req.user.uid, req.body));
    res.json(auth.publicUser(await store.get("users", req.user.uid)));
  }),
);
router.post(
  "/onboarding",
  studentOnly,
  validate(schemas.onboarding),
  run(async (req, res) => {
    await store.transaction((db) =>
      db.put("users", req.user.uid, {
        ...req.body,
        onboardingCompleted: true,
      }),
    );
    res.json({
      ...req.body,
      onboardingCompleted: true,
    });
  }),
);
router.post("/courses/:courseId/enroll", studentOnly, run(courses.enroll));
router.get(
  "/my-courses",
  studentOnly,
  run(async (req, res) => {
    const catalog = await store.list("courses");
    const enrollments = await store.list("enrollments", {
      userId: req.user.uid,
    });
    res.json(
      enrollments
        .map((e) => ({
          ...e,
          course: catalog.find((c) => c.id === e.courseId),
        }))
        .filter((e) => e.course),
    );
  }),
);
router.get(
  "/dashboard",
  studentOnly,
  run(async (req, res) => {
    const enrollments = await store.list("enrollments", {
      userId: req.user.uid,
    });
    const certificates = await store.list("certificates", {
      userId: req.user.uid,
    });
    const progress = await store.list("lessonProgress", {
      userId: req.user.uid,
    });
    const activity = (
      await store.list("activityLogs", { userId: req.user.uid })
    )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
    res.json({
      enrolled: enrollments.length,
      completed: enrollments.filter((e) => e.status === "Completed").length,
      certificates: certificates.length,
      hours:
        Math.round(
          (progress.reduce((sum, p) => sum + (p.minutes || 0), 0) / 60) * 10,
        ) / 10,
      activity,
    });
  }),
);
router.get(
  "/learning-path",
  studentOnly,
  run(async (req, res) => {
    const user = await store.get("users", req.user.uid);
    const path =
      user?.learningPathId && user.learningPathAssignedBy
        ? await store.get("learningPaths", user.learningPathId)
        : null;
    if (!path) return res.json(null);
    const catalog = await store.list("courses");
    const enrollments = await store.list("enrollments", {
      userId: req.user.uid,
    });
    res.json(
      path
        ? {
            ...path,
            courses: path.courseIds
              .map((id) => ({
                ...catalog.find((c) => c.id === id),
                enrollment: enrollments.find((e) => e.courseId === id),
              }))
              .filter((c) => c.id && c.published),
          }
        : null,
    );
  }),
);
router.get(
  "/courses/:courseId/progress",
  studentOnly,
  run(async (req, res) => {
    const course = await store.get("courses", req.params.courseId);
    assert(course?.published, 404, "Course unavailable.");
    const enrollment = await store.get(
      "enrollments",
      `${req.user.uid}_${course.id}`,
    );
    assert(enrollment, 403, "Enroll first.");
    const modules = await getCurriculum(store, course.id);
    const progress = await store.list("lessonProgress", {
      userId: req.user.uid,
      courseId: course.id,
    });
    const quizzes = await store.list("quizzes");
    let unlocked = true;
    for (const m of modules)
      for (const l of m.lessons) {
        const completed = progress.some(
          (p) => p.lessonId === l.id && p.completed,
        );
        const locked = course.sequentialLearning && !unlocked && !completed;
        l.completed = completed;
        l.locked = locked;
        if (locked) {
          delete l.content;
          delete l.videoUrl;
          delete l.resources;
        } else {
          const q = quizzes.find((q) => q.lessonId === l.id);
          if (q) {
            const attempts = (await store.list("quizAttempts")).filter(
              (a) => a.userId === req.user.uid && a.quizId === q.id,
            );
            const questions = q.questions.map(
              ({ correctAnswers, explanation, ...question }) => question,
            );
            if (q.randomize) questions.sort(() => Math.random() - 0.5);
            l.quiz = {
              id: q.id,
              title: q.title,
              passingPercentage: q.passingPercentage,
              maxAttempts: q.maxAttempts,
              attemptsUsed: attempts.length,
              questions,
            };
          }
        }
        if (l.required && !completed) unlocked = false;
      }
    res.json({ course, enrollment, modules, progress });
  }),
);
router.post(
  "/lessons/:lessonId/open",
  studentOnly,
  run(async (req, res) => {
    await store.transaction(async (db) => {
      await lessonContext(db, req.params.lessonId, req.user.uid);
      await db.put("lessonVisits", `${req.user.uid}_${req.params.lessonId}`, {
        userId: req.user.uid,
        lessonId: req.params.lessonId,
        openedAt: new Date().toISOString(),
      });
    });
    res.json({ success: true });
  }),
);
router.post(
  "/lessons/:lessonId/complete",
  studentOnly,
  validate(
    z.object({
      exercise: z.string().max(10000).optional(),
      watchedSeconds: z.number().min(0).optional(),
    }),
  ),
  run(async (req, res) => {
    const result = await store.transaction(async (db) => {
      const context = await lessonContext(
        db,
        req.params.lessonId,
        req.user.uid,
      );
      const visit = await db.get(
        "lessonVisits",
        `${req.user.uid}_${req.params.lessonId}`,
      );
      assert(visit, 400, "Open the lesson before completing it.");
      assert(
        context.lesson.type !== "quiz" &&
          context.lesson.unlockRule !== "quizPassed",
        400,
        "Pass the quiz to complete this lesson.",
      );
      if (
        context.lesson.type === "exercise" ||
        context.lesson.type === "assignment" ||
        context.lesson.unlockRule === "exerciseSubmitted"
      )
        assert(
          req.body.exercise?.trim().length >= 30,
          400,
          "Submit an exercise response of at least 30 characters.",
        );
      if (
        context.lesson.type === "video" ||
        context.lesson.unlockRule === "videoWatched"
      ) {
        const elapsed = (Date.now() - Date.parse(visit.openedAt)) / 1000;
        assert(
          (req.body.watchedSeconds || 0) >=
            context.lesson.duration * 60 * 0.9 &&
            elapsed >= context.lesson.duration * 60 * 0.9,
          400,
          "Watch at least 90% of the video first.",
        );
      }
      const result = await completeLesson(
        db,
        context,
        req.user.uid,
        context.lesson.duration,
      );
      if (req.body.exercise)
        await db.put(
          "exerciseSubmissions",
          `${req.user.uid}_${context.lesson.id}`,
          {
            userId: req.user.uid,
            lessonId: context.lesson.id,
            response: req.body.exercise,
          },
        );
      return result;
    });
    res.json(result);
  }),
);
router.post(
  "/quizzes/:quizId/submit",
  studentOnly,
  sensitive,
  validate(
    z.object({
      answers: z.record(z.string(), z.array(z.number().int().min(0).max(10))),
    }),
  ),
  run(async (req, res) => {
    const result = await store.transaction(async (db) => {
      const quiz = await db.get("quizzes", req.params.quizId);
      assert(quiz, 404, "Quiz not found.");
      const context = await lessonContext(db, quiz.lessonId, req.user.uid);
      const attempts = await db.list("quizAttempts", {
        userId: req.user.uid,
        quizId: quiz.id,
      });
      assert(
        attempts.length < quiz.maxAttempts,
        400,
        "You have used all attempts. Contact support.",
      );
      const result = gradeQuiz(quiz, req.body.answers);
      await db.put("quizAttempts", randomUUID(), {
        userId: req.user.uid,
        quizId: quiz.id,
        courseId: quiz.courseId,
        ...result,
        answers: req.body.answers,
      });
      if (result.passed)
        await completeLesson(
          db,
          context,
          req.user.uid,
          context.lesson.duration,
        );
      return {
        ...result,
        attemptsRemaining: quiz.maxAttempts - attempts.length - 1,
      };
    });
    res.json(result);
  }),
);
router.get(
  "/my-projects",
  studentOnly,
  run(async (req, res) =>
    res.json(await store.list("projects", { userId: req.user.uid })),
  ),
);
async function saveProject(req, res) {
  const id = req.params.id || randomUUID();
  await store.transaction(async (db) => {
    const current = await db.get("projects", id);
    if (req.params.id) {
      assert(current?.userId === req.user.uid, 404, "Project not found.");
      assert(
        ["Draft", "Changes Requested"].includes(current.status),
        400,
        "This project cannot be edited while in review or approved.",
      );
      assert(
        current.courseId === req.body.courseId,
        400,
        "A project cannot be moved between courses.",
      );
    }
    assert(
      await db.get("enrollments", `${req.user.uid}_${req.body.courseId}`),
      403,
      "Enroll in the course first.",
    );
    if (req.body.status === "Submitted")
      assert(
        req.body.finalResult.length >= 30 && req.body.reflection.length >= 20,
        400,
        "Add your final result and reflection before submitting.",
      );
    await db.put("projects", id, {
      ...req.body,
      userId: req.user.uid,
      studentName: req.profile?.name || req.user.name,
    });
  });
  res.json(await store.get("projects", id));
}
router.post(
  "/projects",
  studentOnly,
  validate(schemas.project),
  run(saveProject),
);
router.put(
  "/projects/:id",
  studentOnly,
  validate(schemas.project),
  run(saveProject),
);
router.get(
  "/my-certificates",
  studentOnly,
  run(async (req, res) =>
    res.json(await store.list("certificates", { userId: req.user.uid })),
  ),
);
router.post(
  "/courses/:courseId/certificate",
  studentOnly,
  run(async (req, res) =>
    res
      .status(201)
      .json(
        await store.transaction((db) =>
          issueCertificate(db, req.user.uid, req.params.courseId),
        ),
      ),
  ),
);
router.get(
  "/certificates/:id/pdf",
  run(async (req, res) => {
    const certificate = await store.get("certificates", req.params.id);
    assert(certificate?.valid, 404, "Certificate not found.");
    assert(
      certificate.userId === req.user.uid ||
        ["admin", "superadmin"].includes(req.user.role),
      403,
      "Access denied.",
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${certificate.id}.pdf"`,
    );
    const pdf = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 60,
    });
    pdf.pipe(res);
    pdf.rect(0, 0, 842, 595).fill("#0b1020");
    pdf.strokeColor("#7165fa").lineWidth(2).rect(30, 30, 782, 535).stroke();
    pdf
      .fillColor("#a5a0ff")
      .fontSize(18)
      .text("Ai Learning Uni  /  CERTIFICATE OF COMPLETION", 60, 85, {
        align: "center",
      });
    pdf
      .fillColor("#ffffff")
      .fontSize(15)
      .text("This certificate is proudly presented to", 60, 160, {
        align: "center",
      });
    pdf
      .fontSize(38)
      .text(certificate.studentName, 60, 200, { align: "center" });
    pdf
      .fontSize(17)
      .text(`For successfully completing ${certificate.courseTitle}`, 60, 275, {
        align: "center",
      });
    pdf
      .fillColor("#aab2c8")
      .fontSize(12)
      .text(
        `Issued ${new Date(certificate.completionDate).toLocaleDateString("en-GB")}  ·  ${certificate.id}`,
        60,
        380,
        { align: "center" },
      );
    pdf.text(certificate.verificationUrl, 60, 410, {
      align: "center",
      link: certificate.verificationUrl,
    });
    pdf.end();
  }),
);
router.get(
  "/saved-prompts",
  studentOnly,
  run(async (req, res) =>
    res.json(await store.list("savedPrompts", { userId: req.user.uid })),
  ),
);
router.post(
  "/saved-prompts",
  studentOnly,
  validate(schemas.prompt),
  run(async (req, res) => {
    const id = randomUUID();
    await store.transaction((db) =>
      db.put("savedPrompts", id, { ...req.body, userId: req.user.uid }),
    );
    res.status(201).json(await store.get("savedPrompts", id));
  }),
);
router.put(
  "/saved-prompts/:id",
  studentOnly,
  validate(schemas.prompt),
  run(async (req, res) => {
    await store.transaction(async (db) => {
      assert(
        (await db.get("savedPrompts", req.params.id))?.userId === req.user.uid,
        404,
        "Prompt not found.",
      );
      await db.put("savedPrompts", req.params.id, req.body);
    });
    res.json(await store.get("savedPrompts", req.params.id));
  }),
);
router.delete(
  "/saved-prompts/:id",
  studentOnly,
  run(async (req, res) => {
    await store.transaction(async (db) => {
      assert(
        (await db.get("savedPrompts", req.params.id))?.userId === req.user.uid,
        404,
        "Prompt not found.",
      );
      await db.delete("savedPrompts", req.params.id);
    });
    res.json({ success: true });
  }),
);
router.post("/ai/generate", studentOnly, (_req, res) =>
  res.status(501).json({
    error:
      "AI generation is not enabled yet. Use the structured prompt builder and your preferred AI tool.",
  }),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    cb(
      null,
      [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
        "text/plain",
      ].includes(file.mimetype),
    ),
});
router.post(
  "/uploads",
  sensitive,
  upload.single("file"),
  run(async (req, res) => {
    assert(
      req.file,
      400,
      "Upload a PNG, JPEG, WebP, PDF, or text file (maximum 10 MB).",
    );
    const bytes = req.file.buffer;
    const valid =
      req.file.mimetype === "application/pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : req.file.mimetype === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : req.file.mimetype === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216
            : req.file.mimetype === "image/webp"
              ? bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP"
              : !bytes.includes(0);
    assert(valid, 400, "The file content does not match its type.");
    const id = randomUUID();
    const storagePath = `uploads/${req.user.uid}/${id}`;
    if (mode === "firebase") {
      assert(bucket, 503, "Firebase Storage is not configured.");
      await bucket
        .file(storagePath)
        .save(bytes, { contentType: req.file.mimetype, resumable: false });
    } else {
      await mkdir(uploadsDirectory, { recursive: true });
      await writeFile(resolve(uploadsDirectory, id), bytes);
    }
    await store.transaction((db) =>
      db.put("uploads", id, {
        userId: req.user.uid,
        name: req.file.originalname.slice(0, 200),
        mime: req.file.mimetype,
        storagePath,
      }),
    );
    res
      .status(201)
      .json({ id, name: req.file.originalname, url: `/api/uploads/${id}` });
  }),
);
router.get(
  "/uploads/:id",
  run(async (req, res) => {
    const file = await store.get("uploads", req.params.id);
    assert(file, 404, "File not found.");
    let permitted =
      file.userId === req.user.uid ||
      ["admin", "superadmin"].includes(req.user.role);
    if (!permitted && req.user.role === "student") {
      for (const enrollment of await store.list("enrollments", {
        userId: req.user.uid,
      })) {
        const modules = await getCurriculum(store, enrollment.courseId);
        const candidates = modules
          .flatMap((m) => m.lessons)
          .filter((l) =>
            l.resources?.some((r) => r.url === `/api/uploads/${file.id}`),
          );
        for (const lesson of candidates) {
          try {
            await lessonContext(store, lesson.id, req.user.uid);
            permitted = true;
          } catch {}
        }
      }
    }
    if (!permitted && req.user.role === "instructor") {
      for (const project of await store.list("projects"))
        if (
          project.attachment === `/api/uploads/${file.id}` &&
          (await store.get("courses", project.courseId))?.instructorId ===
            req.user.uid
        )
          permitted = true;
    }
    assert(permitted, 403, "Access denied.");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.type(file.mime);
    res.send(
      mode === "firebase"
        ? (await bucket.file(file.storagePath).download())[0]
        : await readFile(resolve(uploadsDirectory, file.id)),
    );
  }),
);
router.put(
  "/admin/projects/:id/review",
  roles("admin", "superadmin", "instructor"),
  validate(
    z.object({
      status: z.enum(["Under Review", "Changes Requested", "Approved"]),
      feedback: z.string().min(5).max(5000),
    }),
  ),
  run(async (req, res) => {
    await store.transaction(async (db) => {
      const project = await db.get("projects", req.params.id);
      assert(
        project && project.status !== "Draft",
        404,
        "Submitted project not found.",
      );
      if (req.user.role === "instructor")
        assert(
          (await db.get("courses", project.courseId))?.instructorId ===
            req.user.uid,
          403,
          "You can only review projects for your own courses.",
        );
      await db.put("projects", project.id, {
        ...req.body,
        reviewedBy: req.user.uid,
      });
    });
    res.json(await store.get("projects", req.params.id));
  }),
);

router.get(
  "/notifications",
  studentOnly,
  run(async (req, res) => {
    const activities = await store.list("activityLogs", {
      userId: req.user.uid,
    });
    const projects = await store.list("projects", { userId: req.user.uid });
    const certificates = await store.list("certificates", {
      userId: req.user.uid,
    });
    const notifications = [
      ...activities.map((a) => ({
        id: a.id,
        type: "learning",
        title: "One step forward",
        message: a.message,
        date: a.createdAt,
      })),
      ...projects
        .filter((p) => p.feedback)
        .map((p) => ({
          id: p.id,
          type: "project",
          title: p.title,
          message: p.status + ": " + p.feedback,
          date: p.updatedAt,
        })),
      ...certificates
        .filter((c) => c.valid)
        .map((c) => ({
          id: c.id,
          type: "certificate",
          title: "You earned this",
          message: c.courseTitle + " certificate is ready to download.",
          date: c.completionDate,
        })),
    ];
    res.json(
      notifications.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50),
    );
  }),
);
router.post(
  "/notifications/read",
  studentOnly,
  run(async (req, res) => {
    await store.transaction((db) =>
      db.put("users", req.user.uid, {
        lastNotificationsViewedAt: new Date().toISOString(),
      }),
    );
    res.json({ success: true });
  }),
);
router.get(
  "/instructor/projects",
  roles("instructor"),
  run(async (req, res) => {
    const assigned = (
      await store.list("courses", { instructorId: req.user.uid })
    ).map((c) => c.id);
    res.json(
      (await store.list("projects")).filter(
        (p) => assigned.includes(p.courseId) && p.status !== "Draft",
      ),
    );
  }),
);
export default router;
