import { randomUUID } from "node:crypto";
import { assert } from "../utils/errors.js";
import { publicAppUrl } from "../config/deployment.js";
export async function getCurriculum(db, courseId) {
  const modules = (await db.list(`courses/${courseId}/modules`)).sort(
    (a, b) => a.order - b.order,
  );
  for (const module of modules)
    module.lessons = (
      await db.list(`courses/${courseId}/modules/${module.id}/lessons`)
    ).sort((a, b) => a.order - b.order);
  return modules;
}
export async function lessonContext(db, lessonId, userId) {
  const lookup = await db.get("lessonLookup", lessonId);
  assert(lookup, 404, "Lesson not found.");
  const course = await db.get("courses", lookup.courseId);
  assert(course?.published, 404, "Course unavailable.");
  const enrollment = await db.get("enrollments", `${userId}_${course.id}`);
  assert(enrollment, 403, "Enroll in this course first.");
  const modules = await getCurriculum(db, course.id);
  const lessons = modules.flatMap((m) => m.lessons);
  const lesson = lessons.find((l) => l.id === lessonId);
  assert(lesson, 404, "Lesson not found.");
  const progress = await db.list("lessonProgress", {
    userId,
    courseId: course.id,
    completed: true,
  });
  const index = lessons.findIndex((l) => l.id === lessonId);
  assert(
    !course.sequentialLearning ||
      lessons
        .slice(0, index)
        .filter((l) => l.required)
        .every((l) => progress.some((p) => p.lessonId === l.id)),
    403,
    "Complete the previous required lessons first.",
  );
  return { course, enrollment, modules, lessons, lesson, progress, lookup };
}
export function gradeQuiz(quiz, answers) {
  let earned = 0;
  let total = 0;
  const results = quiz.questions.map((q) => {
    const response = answers[q.id] || [];
    const correct =
      new Set(response).size === q.correctAnswers.length &&
      q.correctAnswers.every((i) => response.includes(i));
    total += q.points;
    if (correct) earned += q.points;
    return {
      questionId: q.id,
      question: q.question,
      selectedOptions: response
        .map((index) => q.options[index])
        .filter(Boolean),
      correct,
      ...(quiz.showExplanation
        ? {
            explanation: q.explanation,
            correctAnswers: q.correctAnswers,
            correctOptions: q.correctAnswers.map((index) => q.options[index]),
          }
        : {}),
    };
  });
  const score = Math.round((earned / total) * 100);
  return { score, passed: score >= quiz.passingPercentage, results };
}
export async function completeLesson(db, context, userId, minutes = 0) {
  const { course, lesson, progress, lessons, enrollment } = context;
  const completed = new Set([...progress.map((p) => p.lessonId), lesson.id]);
  const required = lessons.filter((l) => l.required);
  const percentage = required.length
    ? Math.round(
        (required.filter((l) => completed.has(l.id)).length / required.length) *
          100,
      )
    : 100;
  const finished = percentage === 100;
  await db.put("lessonProgress", `${userId}_${lesson.id}`, {
    userId,
    courseId: course.id,
    moduleId: lesson.moduleId,
    lessonId: lesson.id,
    completed: true,
    minutes: Math.min(minutes, lesson.duration),
    completedAt: new Date().toISOString(),
  });
  await db.put("enrollments", enrollment.id, {
    ...enrollment,
    progress: percentage,
    status: finished ? "Completed" : "In Progress",
    currentLessonId: lessons.find((l) => !completed.has(l.id))?.id || lesson.id,
    ...(finished ? { completedAt: new Date().toISOString() } : {}),
  });
  await db.put("activityLogs", randomUUID(), {
    userId,
    type: "lesson",
    message: `Completed ${lesson.title}`,
    courseId: course.id,
  });
  return { progress: percentage, completed: finished };
}
export async function eligibleCertificate(db, userId, courseId) {
  const settings = await db.get("settings", "platform");
  assert(
    settings?.certificateEnabled !== false,
    400,
    "Certificate issuance is currently disabled.",
  );
  const course = await db.get("courses", courseId);
  assert(
    course?.certificateEnabled,
    400,
    "Certificates are not enabled for this course.",
  );
  const modules = await getCurriculum(db, courseId);
  const required = modules.flatMap((m) => m.lessons).filter((l) => l.required);
  assert(required.length > 0, 400, "The course has no required lessons.");
  const progress = await db.list("lessonProgress", {
    userId,
    courseId,
    completed: true,
  });
  assert(
    required.every((l) => progress.some((p) => p.lessonId === l.id)),
    400,
    "Complete all required lessons first.",
  );
  const attempts = await db.list("quizAttempts", { userId, passed: true });
  const quizzes = (await db.list("quizzes")).filter(
    (q) => q.courseId === courseId && required.some((l) => l.id === q.lessonId),
  );
  assert(
    quizzes.every((q) => attempts.some((a) => a.quizId === q.id)),
    400,
    "Pass all required quizzes first.",
  );
  if (course.projectRequired)
    assert(
      (await db.list("projects")).some(
        (p) =>
          p.userId === userId &&
          p.courseId === courseId &&
          p.status === "Approved",
      ),
      400,
      "Your final project needs approval first.",
    );
  return course;
}
export async function issueCertificate(db, userId, courseId) {
  const course = await eligibleCertificate(db, userId, courseId);
  const user = await db.get("users", userId);
  assert(user, 404, "Student not found.");
  const existing = (await db.list("certificates")).find(
    (c) => c.userId === userId && c.courseId === courseId,
  );
  if (existing?.valid) return existing;
  const id = `ATLAS-${randomUUID().slice(0, 8).toUpperCase()}`;
  const certificate = {
    id,
    userId,
    studentName: user.name,
    courseId,
    courseTitle: course.title,
    completionDate: new Date().toISOString(),
    verificationUrl: `${publicAppUrl}/certificate/${id}`,
    valid: true,
  };
  await db.put("certificates", id, certificate);
  return certificate;
}
