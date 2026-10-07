export function courseLessonState(data, selected) {
  const lessons =
    data?.modules?.flatMap((module) => module.lessons || []) || [];
  const requested = lessons.find((lesson) => lesson.id === selected);
  const lesson =
    (requested && !requested.locked ? requested : null) ||
    lessons.find(
      (lesson) =>
        lesson.id === data?.enrollment?.currentLessonId && !lesson.locked,
    ) ||
    lessons.find((lesson) => !lesson.locked);
  const index = lesson ? lessons.indexOf(lesson) : -1;
  return {
    lessons,
    lesson,
    index,
    next: index >= 0 ? lessons[index + 1] : undefined,
    advancing: Boolean(requested?.locked),
  };
}
