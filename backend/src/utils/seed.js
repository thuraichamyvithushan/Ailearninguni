import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { store } from "../services/store.js";
import { mode } from "../config/firebase.js";
import {
  categories,
  seedCourses,
  seedPaths,
  curriculum,
} from "../services/seedData.js";
export async function seed() {
  if ((await store.list("courses")).length) return;
  const passwordHash =
    mode === "demo" ? await bcrypt.hash("AtlasDemo2026!", 12) : null;
  await store.transaction(async (tx) => {
    for (const category of categories)
      await tx.put("categories", category.id, category);
    for (const course of seedCourses) {
      await tx.put("courses", course.id, course);
      for (const module of curriculum(course)) {
        const { lessons, ...fields } = module;
        await tx.put(`courses/${course.id}/modules`, module.id, fields);
        for (const lesson of lessons) {
          await tx.put(
            `courses/${course.id}/modules/${module.id}/lessons`,
            lesson.id,
            lesson,
          );
          await tx.put("lessonLookup", lesson.id, {
            courseId: course.id,
            moduleId: module.id,
          });
          if (lesson.type === "quiz")
            await tx.put("quizzes", `quiz-${lesson.id}`, {
              id: `quiz-${lesson.id}`,
              courseId: course.id,
              lessonId: lesson.id,
              title: "AI essentials: knowledge check",
              passingPercentage: 70,
              maxAttempts: 3,
              randomize: true,
              showExplanation: true,
              questions: [
                {
                  id: "q1",
                  type: "multiple-choice",
                  question: "Which ingredient makes a prompt more useful?",
                  options: [
                    "A clear task and relevant context",
                    "The longest possible message",
                    "Only a single keyword",
                  ],
                  correctAnswers: [0],
                  explanation:
                    "A clear task and relevant context help the model produce a useful response.",
                  points: 1,
                },
                {
                  id: "q2",
                  type: "true-false",
                  question:
                    "AI-generated factual claims should be checked before use.",
                  options: ["True", "False"],
                  correctAnswers: [0],
                  explanation:
                    "AI can generate plausible but inaccurate claims. Verify them.",
                  points: 1,
                },
                {
                  id: "q3",
                  type: "multiple-select",
                  question: "Select the responsible practices.",
                  options: [
                    "Protect confidential information",
                    "Review outputs for bias",
                    "Publish all outputs without checking",
                  ],
                  correctAnswers: [0, 1],
                  explanation:
                    "Protect sensitive data and review the response before using it.",
                  points: 2,
                },
              ],
            });
        }
      }
    }
    for (const path of seedPaths) await tx.put("learningPaths", path.id, path);
    await tx.put("instructors", "instructor-samara", {
      name: "Samara Chen",
      title: "AI educator & workflow designer",
      email: "samara@example.com",
    });
    for (const [id, name, price] of [
      ["self-paced", "Self-paced", 29],
      ["group", "Group learning", 99],
      ["one-to-one", "One-to-one", 199],
    ])
      await tx.put("packages", id, {
        name,
        price,
        description: "Per month · learning access and support",
        active: true,
      });
    if (mode === "demo") {
      await tx.put("users", "demo-student", {
        name: "Alex Morgan",
        email: "student@aiatlas.demo",
        role: "student",
        status: "active",
        onboardingCompleted: true,
        profession: "Marketing",
        aiLevel: "Beginner",
        goal: "Create content",
        learningStyle: "Self-paced",
        weeklyStudyTime: "2–5 hours",
        passwordHash,
        learningPathId: "path-marketing",
        learningPathAssignedBy: "demo-admin",
        learningPathAssignedAt: new Date().toISOString(),
      });
      await tx.put("users", "demo-admin", {
        name: "Jordan Lee",
        email: "admin@aiatlas.demo",
        role: "superadmin",
        status: "active",
        onboardingCompleted: true,
        passwordHash,
      });
      await tx.put("enrollments", "demo-student_ai-foundations", {
        userId: "demo-student",
        courseId: "ai-foundations",
        progress: 25,
        status: "In Progress",
        currentLessonId: "ai-foundations-m1-l3",
        enrolledAt: new Date().toISOString(),
      });
      for (const [index, id] of [
        "ai-foundations-m1-l1",
        "ai-foundations-m1-l2",
      ].entries())
        await tx.put("lessonProgress", `demo-student_${id}`, {
          userId: "demo-student",
          courseId: "ai-foundations",
          moduleId: "ai-foundations-m1",
          lessonId: id,
          completed: true,
          completedAt: new Date().toISOString(),
          minutes: 10 + index * 3,
        });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await seed();
  console.log("Course catalog seeded.");
}
