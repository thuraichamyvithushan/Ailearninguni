export const categories = [
  "Marketing",
  "Business",
  "Law",
  "Technology",
  "Education",
  "Student",
  "Other",
].map((name, index) => ({
  id: name.toLowerCase(),
  name,
  color: ["violet", "blue", "amber", "cyan", "pink", "green", "violet"][index],
}));
const definitions = [
  [
    "ai-foundations",
    "AI Foundations",
    "Understand the technology. Discover the possibilities. Build your first practical AI workflow.",
    "other",
    "Beginner",
    "4 hours",
    0,
    "cyan",
    false,
  ],
  [
    "prompt-engineering",
    "The Art of Prompt Engineering",
    "Turn good questions into great results with a repeatable framework for better prompts.",
    "technology",
    "Beginner",
    "6 hours",
    49,
    "violet",
    false,
  ],
  [
    "ai-for-marketing",
    "AI for Marketing & Content",
    "Find your creative edge. Plan campaigns, create content, and connect with your audience.",
    "marketing",
    "Intermediate",
    "8 hours",
    79,
    "pink",
    true,
  ],
  [
    "ai-automation",
    "Build Smarter AI Workflows",
    "Bring your tools together and automate the repetitive work that slows you down.",
    "business",
    "Intermediate",
    "7 hours",
    89,
    "blue",
    true,
  ],
  [
    "ai-for-law",
    "AI for Legal Research",
    "Learn responsible research workflows, evaluate sources, and organize legal information.",
    "law",
    "Intermediate",
    "6 hours",
    79,
    "amber",
    true,
  ],
  [
    "ai-for-education",
    "AI for Teaching & Learning",
    "Design thoughtful learning materials and give every student a better starting point.",
    "education",
    "Beginner",
    "5 hours",
    59,
    "green",
    true,
  ],
];
export const seedCourses = definitions.map(
  ([
    id,
    title,
    shortDescription,
    categoryId,
    level,
    duration,
    price,
    color,
    projectRequired,
  ]) => ({
    id,
    title,
    slug: id,
    shortDescription,
    description: `${shortDescription}\n\nA practical, step-by-step course built around real work. Learn the fundamentals, practice with guided exercises, and demonstrate your skills.`,
    categoryId,
    level,
    duration,
    price,
    color,
    instructorId: "instructor-samara",
    instructor: "Samara Chen",
    thumbnail: "",
    published: true,
    featured: true,
    sequentialLearning: true,
    certificateEnabled: true,
    projectRequired,
    prerequisites: level === "Intermediate" ? ["AI Foundations"] : [],
    learningOutcomes: [
      "Understand where AI adds value in your work",
      "Build clear, structured prompts",
      "Evaluate outputs and protect sensitive data",
      "Create a practical workflow you can use immediately",
    ],
  }),
);
export function curriculum(course) {
  const topics = [
    [
      "A new way to work",
      [
        "Welcome to your AI journey",
        "How generative AI works",
        "Your first structured prompt",
        "Check your understanding",
      ],
    ],
    [
      "From knowledge to practice",
      [
        "Give AI the right context",
        "Evaluate and improve outputs",
        "Build your everyday workflow",
        "Reflect on your learning",
      ],
    ],
  ];
  return topics.map(([title, titles], order) => ({
    id: `${course.id}-m${order + 1}`,
    courseId: course.id,
    title,
    description: order
      ? "Apply your skills to a realistic task."
      : "Build a confident foundation.",
    order,
    lessons: titles.map((title, index) => {
      const type =
        index === 3 && order === 0 ? "quiz" : index === 2 ? "exercise" : "text";
      return {
        id: `${course.id}-m${order + 1}-l${index + 1}`,
        courseId: course.id,
        moduleId: `${course.id}-m${order + 1}`,
        title,
        type,
        order: index,
        duration: 10 + index * 3,
        required: true,
        preview: order === 0 && index === 0,
        unlockRule:
          type === "quiz"
            ? "quizPassed"
            : type === "exercise"
              ? "exerciseSubmitted"
              : "opened",
        videoUrl: "",
        resources: [],
        content: `## ${title}\n\nAI works best when you give it a clear task, useful context, and a specific output format. In this lesson, you will connect these ideas to your own work.\n\n### A framework you can reuse\n\n1. Define the role: what expertise would help?\n2. State the task with a concrete goal.\n3. Add relevant background and constraints.\n4. Specify the format of the response.\n5. Review the result for accuracy, bias, and usefulness.\n\n### Try it in your field\n\nAsk an AI assistant to help you plan a small project. Describe your audience, available time, and desired result. Compare a broad prompt with a structured one.\n\nKeep confidential information out of public AI tools, and check factual claims against reliable sources.`,
        description: "Learn a practical framework, then put it to work.",
      };
    }),
  }));
}
export const seedPaths = categories.map((c) => ({
  id: `path-${c.id}`,
  title: `${c.name === "Other" ? "Everyday" : c.name} AI pathway`,
  profession: c.name,
  skillLevel: "Beginner",
  goal: "Improve productivity",
  courseIds: [
    "ai-foundations",
    "prompt-engineering",
    c.id === "marketing"
      ? "ai-for-marketing"
      : c.id === "law"
        ? "ai-for-law"
        : c.id === "education"
          ? "ai-for-education"
          : "ai-automation",
  ],
  description:
    "Start with the foundations. Build your confidence. Put AI to work.",
}));
