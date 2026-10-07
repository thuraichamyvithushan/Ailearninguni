import { z } from "zod";
const text = z.string().trim().min(1).max(500);
export const credentials = z.object({
  name: text.optional(),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
export const profile = z.object({
  name: text,
  photoURL: z.string().url().or(z.literal("")).optional(),
});
export const onboarding = z.object({
  profession: z.enum([
    "Marketing",
    "Business",
    "Law",
    "Technology",
    "Education",
    "Student",
    "Other",
  ]),
  aiLevel: z.enum(["New to AI", "Beginner", "Intermediate", "Advanced"]),
  goal: z.enum([
    "Improve productivity",
    "Learn prompt engineering",
    "Automate tasks",
    "Advance my career",
    "Build AI applications",
    "Improve research",
    "Create content",
  ]),
  learningStyle: z.enum(["Self-paced", "Group", "One-to-one"]),
  weeklyStudyTime: z.enum([
    "Less than 2 hours",
    "2–5 hours",
    "5–10 hours",
    "10+ hours",
  ]),
});
export const course = z.object({
  title: text,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  shortDescription: text,
  description: z.string().max(20000).default(""),
  categoryId: text,
  instructorId: text.default("instructor-samara"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  thumbnail: z.string().max(2000).default(""),
  duration: text,
  price: z.coerce.number().min(0).max(100000),
  published: z.boolean(),
  featured: z.boolean(),
  sequentialLearning: z.boolean(),
  certificateEnabled: z.boolean(),
  projectRequired: z.boolean(),
  prerequisites: z.array(text).default([]),
  learningOutcomes: z.array(text).default([]),
});
export const moduleSchema = z.object({
  title: text,
  description: z.string().max(2000).default(""),
  order: z.coerce.number().int().min(0),
});
export const lesson = z.object({
  title: text,
  type: z.enum([
    "video",
    "text",
    "image",
    "pdf",
    "resource",
    "exercise",
    "quiz",
    "assignment",
  ]),
  description: z.string().max(2000).default(""),
  content: z.string().max(40000).default(""),
  videoUrl: z.string().url().or(z.literal("")).default(""),
  duration: z.coerce.number().min(0).max(1000).default(10),
  order: z.coerce.number().int().min(0),
  required: z.boolean().default(true),
  preview: z.boolean().default(false),
  unlockRule: z
    .enum(["opened", "videoWatched", "exerciseSubmitted", "quizPassed"])
    .default("opened"),
  resources: z
    .array(
      z.object({
        name: text,
        url: z
          .string()
          .url()
          .or(z.string().regex(/^\/api\/uploads\/[a-f0-9-]+$/)),
      }),
    )
    .default([]),
});
export const prompt = z.object({
  title: text,
  role: text,
  task: text,
  context: z.string().max(10000).default(""),
  constraints: z.string().max(5000).default(""),
  outputFormat: text,
  content: z.string().max(20000),
});
export const project = z.object({
  courseId: text,
  title: text,
  description: z.string().min(20).max(10000),
  promptUsed: z.string().max(10000).default(""),
  aiOutput: z.string().max(20000).default(""),
  finalResult: z.string().max(20000).default(""),
  reflection: z.string().max(10000).default(""),
  attachment: z.string().max(2000).default(""),
  status: z.enum(["Draft", "Submitted"]),
});
export const quiz = z.object({
  courseId: text,
  lessonId: text,
  title: text,
  passingPercentage: z.coerce.number().min(1).max(100),
  maxAttempts: z.coerce.number().int().min(1).max(20),
  randomize: z.boolean(),
  showExplanation: z.boolean(),
  questions: z
    .array(
      z
        .object({
          id: text,
          type: z.enum(["multiple-choice", "true-false", "multiple-select"]),
          question: text,
          options: z.array(text).min(2).max(10),
          correctAnswers: z.array(z.number().int().min(0)).min(1),
          explanation: z.string().max(2000),
          points: z.number().min(1).max(100),
        })
        .refine(
          (q) =>
            q.correctAnswers.every((a) => a < q.options.length) &&
            new Set(q.correctAnswers).size === q.correctAnswers.length &&
            (q.type === "multiple-select" || q.correctAnswers.length === 1),
          "Invalid correct answers",
        ),
    )
    .min(1)
    .max(50),
});
