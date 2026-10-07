import { randomUUID } from "node:crypto";
import { store } from "../services/store.js";
import { assert } from "../utils/errors.js";
import { getCurriculum } from "../services/learning.js";
async function courseLabels(courses) {
  const [categories, instructors] = await Promise.all([
    store.list("categories"),
    store.list("instructors"),
  ]);
  return courses.map((course) => ({
    ...course,
    categoryName:
      categories.find((category) => category.id === course.categoryId)?.name ||
      course.categoryId,
    instructor:
      instructors.find((instructor) => instructor.id === course.instructorId)
        ?.name || "",
  }));
}
export async function courseList(_req, res) {
  res.json(
    await courseLabels(
      (await store.list("courses")).filter((c) => c.published),
    ),
  );
}
export async function courseDetail(req, res) {
  const courses = await store.list("courses");
  const course = courses.find(
    (c) => c.id === req.params.id || c.slug === req.params.id,
  );
  assert(course?.published, 404, "Course not found.");
  const [labeledCourse] = await courseLabels([course]);
  const modules = await getCurriculum(store, course.id);
  res.json({
    ...labeledCourse,
    modules: modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        type: l.type,
        preview: l.preview,
        required: l.required,
        ...(l.preview ? { content: l.content } : {}),
      })),
    })),
  });
}
export async function createCourse(req, res) {
  const id = randomUUID();
  await store.transaction(async (db) => {
    assert(
      !(await db.list("courses")).some((c) => c.slug === req.body.slug),
      409,
      "That course slug is already in use.",
    );
    await db.put("courses", id, { ...req.body, id });
  });
  res.status(201).json({ ...req.body, id });
}
export async function updateCourse(req, res) {
  await store.transaction(async (db) => {
    assert(await db.get("courses", req.params.id), 404, "Course not found.");
    assert(
      !(await db.list("courses")).some(
        (c) => c.id !== req.params.id && c.slug === req.body.slug,
      ),
      409,
      "That course slug is already in use.",
    );
    await db.put("courses", req.params.id, req.body);
  });
  res.json({ ...req.body, id: req.params.id });
}
export async function deleteCourse(req, res) {
  await store.transaction(async (db) => {
    assert(await db.get("courses", req.params.id), 404, "Course not found.");
    assert(
      !(await db.list("enrollments")).some((e) => e.courseId === req.params.id),
      409,
      "This course has enrollments. Unpublish it to preserve learner records.",
    );
    const modules = await getCurriculum(db, req.params.id);
    const quizzes = await db.list("quizzes");
    for (const m of modules) {
      for (const l of m.lessons) {
        await db.delete(
          `courses/${req.params.id}/modules/${m.id}/lessons`,
          l.id,
        );
        await db.delete("lessonLookup", l.id);
      }
      await db.delete(`courses/${req.params.id}/modules`, m.id);
    }
    for (const q of quizzes.filter((q) => q.courseId === req.params.id))
      await db.delete("quizzes", q.id);
    await db.delete("courses", req.params.id);
  });
  res.json({ success: true });
}
export async function enroll(req, res) {
  const id = `${req.user.uid}_${req.params.courseId}`;
  const result = await store.transaction(async (db) => {
    const course = await db.get("courses", req.params.courseId);
    assert(course?.published, 404, "Course not found.");
    const existing = await db.get("enrollments", id);
    if (existing) return existing;
    const modules = await getCurriculum(db, course.id);
    const lessons = modules.flatMap((module) => module.lessons);
    const completed = new Set(
      (
        await db.list("lessonProgress", {
          userId: req.user.uid,
          courseId: course.id,
          completed: true,
        })
      ).map((progress) => progress.lessonId),
    );
    const required = lessons.filter((lesson) => lesson.required);
    const percentage = required.length
      ? Math.round(
          (required.filter((lesson) => completed.has(lesson.id)).length /
            required.length) *
            100,
        )
      : 0;
    const row = {
      id,
      userId: req.user.uid,
      courseId: course.id,
      progress: percentage,
      status:
        percentage === 100
          ? "Completed"
          : percentage > 0
            ? "In Progress"
            : "Not Started",
      currentLessonId:
        lessons.find((lesson) => !completed.has(lesson.id))?.id ||
        lessons.at(-1)?.id ||
        "",
      enrolledAt: new Date().toISOString(),
    };
    await db.put("enrollments", id, row);
    return row;
  });
  res.status(201).json(result);
}
