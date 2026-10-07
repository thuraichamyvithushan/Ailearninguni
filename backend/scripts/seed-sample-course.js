import { randomUUID } from "node:crypto";
import { store } from "../src/services/store.js";

async function main() {
  console.log("Adding sample course to store...");

  const existingCourses = await store.list("courses");
  const alreadyExists = existingCourses.find((c) => c.slug === "intro-to-machine-learning");
  if (alreadyExists) {
    console.log("Course already exists with ID:", alreadyExists.id);
    return;
  }

  const categories = await store.list("categories");
  const techCategory = categories.find((c) => c.name.toLowerCase() === "technology") || categories[0];
  const instructors = await store.list("instructors");
  const instructor = instructors[0] || { id: "instructor-1", name: "AI Instructor" };

  const courseId = randomUUID();
  const slug = "intro-to-machine-learning";

  const courseData = {
    title: "Introduction to Machine Learning",
    slug,
    shortDescription: "Understand how machines learn from data and build your first ML intuition without writing complex code.",
    description: "Understand how machines learn from data and build your first ML intuition without writing complex code.\n\nThis beginner-friendly course walks you through core ML concepts — supervised vs. unsupervised learning, training data, model evaluation — then puts theory into practice with guided hands-on exercises and a final knowledge check quiz.",
    categoryId: techCategory.id,
    instructorId: instructor.id,
    level: "Beginner",
    duration: "45 minutes",
    price: 0,
    thumbnail: "",
    published: true,
    featured: true,
    sequentialLearning: true,
    certificateEnabled: true,
    projectRequired: false,
    prerequisites: [],
    learningOutcomes: [
      "Explain what machine learning is and how it differs from traditional code",
      "Distinguish between supervised and unsupervised learning",
      "Understand model training, testing, and overfitting",
      "Spot real-world ML applications and potential biases",
    ],
  };

  await store.put("courses", courseId, courseData);
  console.log("Created course:", courseId);

  // Module 1
  const mod1Id = randomUUID();
  const mod1Data = {
    title: "Module 1: Machine Learning Core Concepts",
    description: "Build a solid foundation in how ML systems learn from data.",
    order: 0,
    courseId,
  };
  await store.put(`courses/${courseId}/modules`, mod1Id, mod1Data);

  // Lesson 1.1
  const l1Id = randomUUID();
  await store.put(`courses/${courseId}/modules/${mod1Id}/lessons`, l1Id, {
    title: "What is Machine Learning?",
    type: "text",
    order: 0,
    duration: 10,
    required: true,
    preview: true,
    unlockRule: "opened",
    videoUrl: "",
    resources: [],
    moduleId: mod1Id,
    courseId,
    description: "The core difference between traditional software and machine learning models.",
    content: `## What is Machine Learning?

In traditional software development, engineers write step-by-step rules:
\`\`\`
IF email contains "free cash" THEN mark as spam
\`\`\`

In **Machine Learning**, we don't write explicit rules. Instead, we feed the computer examples (data) and let the algorithm discover patterns itself.

### Key Types of Machine Learning
1. **Supervised Learning**: Learning from labeled examples (e.g., historical house features & sale prices).
2. **Unsupervised Learning**: Finding hidden patterns in unlabeled data (e.g., customer segmentation).
3. **Reinforcement Learning**: Learning through trial, error, and feedback rewards (e.g., game-playing agents).`,
  });
  await store.put("lessonLookup", l1Id, { courseId, moduleId: mod1Id });

  // Lesson 1.2
  const l2Id = randomUUID();
  await store.put(`courses/${courseId}/modules/${mod1Id}/lessons`, l2Id, {
    title: "Exercise: Identifying ML Types",
    type: "exercise",
    order: 1,
    duration: 15,
    required: true,
    preview: false,
    unlockRule: "exerciseSubmitted",
    videoUrl: "",
    resources: [],
    moduleId: mod1Id,
    courseId,
    description: "Apply your knowledge by classifying real-world use cases.",
    content: `## Hands-on Exercise: Identifying ML Types

Think about three technology applications you use daily (e.g., Netflix recommendations, photo face tagger, fraud detection).

### Your Task:
Write down:
1. Which application you chose
2. Whether it uses **Supervised** or **Unsupervised** learning
3. What input data and output labels it likely relies on

Submit your response below (minimum 30 characters) to proceed!`,
  });
  await store.put("lessonLookup", l2Id, { courseId, moduleId: mod1Id });

  // Module 2
  const mod2Id = randomUUID();
  const mod2Data = {
    title: "Module 2: Model Training & Knowledge Check",
    description: "Understand evaluation metrics, overfitting, and test your comprehension.",
    order: 1,
    courseId,
  };
  await store.put(`courses/${courseId}/modules`, mod2Id, mod2Data);

  // Lesson 2.1
  const l3Id = randomUUID();
  await store.put(`courses/${courseId}/modules/${mod2Id}/lessons`, l3Id, {
    title: "Training, Testing & Overfitting",
    type: "text",
    order: 0,
    duration: 10,
    required: true,
    preview: false,
    unlockRule: "opened",
    videoUrl: "",
    resources: [],
    moduleId: mod2Id,
    courseId,
    description: "Learn how data scientists split datasets and evaluate model performance.",
    content: `## How Models Are Evaluated

To know if a model works, we split data into:
- **Training Set (70–80%)**: Used by the algorithm to learn patterns.
- **Test Set (20–30%)**: Held out to test on unseen data.

### The Problem of Overfitting
If a student memorizes exam questions instead of understanding concepts, they fail when questions change. In ML, this is called **overfitting** — the model memorizes the training data noise rather than real underlying patterns.`,
  });
  await store.put("lessonLookup", l3Id, { courseId, moduleId: mod2Id });

  // Lesson 2.2 - Quiz
  const l4Id = randomUUID();
  await store.put(`courses/${courseId}/modules/${mod2Id}/lessons`, l4Id, {
    title: "Machine Learning Knowledge Check",
    type: "quiz",
    order: 1,
    duration: 10,
    required: true,
    preview: false,
    unlockRule: "quizPassed",
    videoUrl: "",
    resources: [],
    moduleId: mod2Id,
    courseId,
    description: "Test your understanding with a short quiz to complete the course.",
    content: "Complete this quiz to test your comprehension and earn your certificate.",
  });
  await store.put("lessonLookup", l4Id, { courseId, moduleId: mod2Id });

  // Create Quiz document
  const quizId = randomUUID();
  await store.put("quizzes", quizId, {
    id: quizId,
    courseId,
    lessonId: l4Id,
    title: "Machine Learning Knowledge Check",
    passingPercentage: 70,
    maxAttempts: 3,
    randomize: true,
    showExplanation: true,
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "How does Machine Learning differ from traditional programming?",
        options: [
          "Traditional programming uses rules, while ML learns patterns from examples",
          "ML does not require computers or calculations",
          "Traditional programming only works on mobile phones",
          "There is no difference between them",
        ],
        correctAnswers: [0],
        explanation: "Traditional software relies on explicitly programmed rules, whereas machine learning discovers relationships from training data.",
        points: 1,
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "Predicting the sale price of a house using historical sales records is an example of:",
        options: [
          "Unsupervised clustering",
          "Supervised learning",
          "Reinforcement learning",
          "Unbounded robotics",
        ],
        correctAnswers: [1],
        explanation: "Because historical sales data includes known labels (the past prices), it is a supervised learning regression problem.",
        points: 1,
      },
      {
        id: "q3",
        type: "true-false",
        question: "Overfitting happens when a model performs exceptionally well on training data but poorly on new, unseen data.",
        options: ["True", "False"],
        correctAnswers: [0],
        explanation: "True. Overfitting occurs when a model memorizes specific training noise and fails to generalize.",
        points: 1,
      },
      {
        id: "q4",
        type: "multiple-select",
        question: "Which of the following are good practices in responsible Machine Learning? (Select all that apply)",
        options: [
          "Checking outputs and training data for demographic bias",
          "Evaluating models on separate, unseen test sets",
          "Deploying models without any validation testing",
        ],
        correctAnswers: [0, 1],
        explanation: "Evaluating on unseen data and auditing for bias are foundational best practices.",
        points: 2,
      },
    ],
  });

  console.log("Successfully created course, modules, lessons, and quiz in Firestore!");
  console.log({
    courseId,
    slug,
    title: courseData.title,
    modules: 2,
    lessons: 4,
    quizId,
  });
}

main().catch(console.error);
