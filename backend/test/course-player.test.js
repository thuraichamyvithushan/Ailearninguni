import { test } from "node:test";
import assert from "node:assert/strict";
import { courseLessonState } from "../../frontend/src/components/course/progress.js";

test("advancing keeps the unlocked lesson until new progress arrives", () => {
  const first = { id: "first", locked: false, resources: [] };
  const next = { id: "next", locked: true };
  const oldProgress = {
    modules: [{ lessons: [first, next] }],
    enrollment: { currentLessonId: "first" },
  };
  const waiting = courseLessonState(oldProgress, "next");
  assert.equal(waiting.lesson.id, "first");
  assert.equal(waiting.advancing, true);
  assert.equal(waiting.next.locked, true);
  const refreshed = {
    modules: [
      {
        lessons: [
          { ...first, completed: true },
          { ...next, locked: false, resources: [] },
        ],
      },
    ],
    enrollment: { currentLessonId: "next" },
  };
  const ready = courseLessonState(refreshed, "next");
  assert.equal(ready.lesson.id, "next");
  assert.equal(ready.advancing, false);
  assert.deepEqual(ready.lesson.resources, []);
});
test("resume skips a locked current lesson and handles empty courses", () => {
  const data = {
    modules: [
      {
        lessons: [
          { id: "first", locked: false },
          { id: "locked", locked: true },
        ],
      },
    ],
    enrollment: { currentLessonId: "locked" },
  };
  assert.equal(courseLessonState(data, "").lesson.id, "first");
  assert.equal(courseLessonState(undefined, "").lesson, undefined);
  assert.equal(
    courseLessonState({ modules: [], enrollment: {} }, "").next,
    undefined,
  );
});
test("quiz continuation waits for the adjacent lesson to unlock", () => {
  const quiz = { id: "quiz", completed: true, locked: false };
  const later = { id: "later", locked: true };
  const data = {
    modules: [{ lessons: [quiz, later] }],
    enrollment: { currentLessonId: "quiz" },
  };
  assert.equal(courseLessonState(data, "quiz").next.locked, true);
  later.locked = false;
  assert.equal(courseLessonState(data, "quiz").next.locked, false);
  assert.equal(courseLessonState(data, "later").next, undefined);
});
