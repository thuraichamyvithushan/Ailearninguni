import LessonMedia from "../../components/course/LessonMedia";
import { courseLessonState } from "../../components/course/progress";
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileQuestion,
  Lock,
  PanelLeft,
  Play,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Page,
  PageHeading,
  Progress,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { api, download } from "../../services/api";
function LessonContent({ content }) {
  return (
    <div className="lesson-content">
      {content?.split("\n\n").map((block, i) =>
        block.startsWith("### ") ? (
          <h4 key={i}>{block.slice(4)}</h4>
        ) : block.startsWith("## ") ? (
          <h3 key={i}>{block.slice(3)}</h3>
        ) : /^\d+\. /.test(block) ? (
          <ol key={i}>
            {block.split("\n").map((line, j) => (
              <li key={j}>{line.replace(/^\d+\. /, "")}</li>
            ))}
          </ol>
        ) : (
          <p key={i} style={{ whiteSpace: "pre-wrap" }}>
            {block}
          </p>
        ),
      )}
    </div>
  );
}
function Quiz({ quiz, onPassed, ready }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/submit`, {
        answers,
      });
      setResult(data);
      if (data.passed) onPassed();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className={`quiz-result ${!result.passed ? "failed" : ""}`}>
        <Badge tone={result.passed ? "green" : "amber"}>
          {result.passed ? "Quiz passed" : "Keep practicing"}
        </Badge>
        <div style={{ fontSize: 44, marginTop: 20 }}>{result.score}%</div>
        <h3>
          {result.passed
            ? "You’ve got this. Keep moving forward."
            : "A little review can make the difference."}
        </h3>
        <p>
          {result.results.filter((r) => r.correct).length} correct ·{" "}
          {result.results.filter((r) => !r.correct).length} incorrect ·{" "}
          {result.attemptsRemaining} attempts remaining
        </p>
        {result.results.map((r, i) => (
          <div className="quiz-feedback" key={r.questionId}>
            <strong>
              {r.correct ? "✓" : "○"} {r.question}:{" "}
              {r.correct ? "Correct" : "Review this answer"}
            </strong>
            {r.explanation && <p>{r.explanation}</p>}
            {!r.correct && r.correctOptions && (
              <p>Correct answer: {r.correctOptions.join(", ")}</p>
            )}
          </div>
        ))}
        {!result.passed && result.attemptsRemaining > 0 && (
          <Button
            variant="secondary"
            style={{ marginTop: 20 }}
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            Try again
          </Button>
        )}
      </div>
    );
  return (
    <form onSubmit={submit}>
      <div className="notice">
        Pass with {quiz.passingPercentage}% or higher ·{" "}
        {quiz.maxAttempts - quiz.attemptsUsed} attempts remaining
      </div>
      {quiz.questions.map((q, i) => (
        <fieldset
          className="quiz-question"
          key={q.id}
          style={{ borderInline: 0, borderTop: 0 }}
        >
          <legend style={{ fontSize: 13, fontWeight: 600, paddingTop: 15 }}>
            {i + 1}. {q.question}
          </legend>
          {q.options.map((option, index) => {
            const selected = (answers[q.id] || []).includes(index);
            return (
              <label
                key={index}
                className={`quiz-option ${selected ? "selected" : ""}`}
              >
                <input
                  type={q.type === "multiple-select" ? "checkbox" : "radio"}
                  name={q.id}
                  checked={selected}
                  onChange={() =>
                    setAnswers({
                      ...answers,
                      [q.id]:
                        q.type === "multiple-select"
                          ? selected
                            ? (answers[q.id] || []).filter((a) => a !== index)
                            : [...(answers[q.id] || []), index]
                          : [index],
                    })
                  }
                />
                {option}
              </label>
            );
          })}
        </fieldset>
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        busy={busy}
        disabled={
          !ready ||
          quiz.attemptsUsed >= quiz.maxAttempts ||
          quiz.questions.some((q) => !answers[q.id]?.length)
        }
        style={{ marginTop: 24 }}
      >
        Submit answers
        <ArrowRight size={15} />
      </Button>
    </form>
  );
}
export default function CoursePlayer() {
  const { courseId } = useParams();
  return <CourseSession key={courseId} courseId={courseId} />;
}
function CourseSession({ courseId }) {
  const resource = useApi(`/courses/${courseId}/progress`);
  const [selected, setSelected] = useState("");
  const [exercise, setExercise] = useState("");
  const [busy, setBusy] = useState(false);
  const [outline, setOutline] = useState(false);
  const [passed, setPassed] = useState(false);
  const [watched, setWatched] = useState(0);
  const [openedLesson, setOpenedLesson] = useState("");
  const [openError, setOpenError] = useState("");
  const [openAttempt, setOpenAttempt] = useState(0);
  const watchedPoints = useRef(new Set());
  const toast = useToast();
  const navigate = useNavigate();
  const { lessons, lesson, index, next, advancing } = courseLessonState(
    resource.data,
    selected,
  );
  const resources = lesson?.resources || [];
  useEffect(() => {
    let active = true;
    setExercise("");
    setPassed(false);
    setWatched(0);
    watchedPoints.current.clear();
    setOpenedLesson("");
    setOpenError("");
    if (lesson?.id)
      api
        .post(`/lessons/${lesson.id}/open`)
        .then(() => {
          if (active) setOpenedLesson(lesson.id);
        })
        .catch((e) => {
          if (active) setOpenError(e.message);
        });
    return () => {
      active = false;
    };
  }, [lesson?.id, openAttempt]);
  async function complete() {
    setBusy(true);
    try {
      await api.post(`/lessons/${lesson.id}/complete`, {
        exercise,
        watchedSeconds: watched,
      });
      toast("Lesson complete. One step forward.");
      resource.refresh();
      if (next) setSelected(next.id);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function claim() {
    setBusy(true);
    try {
      await api.post(`/courses/${courseId}/certificate`);
      toast("Your certificate is ready to download.");
      navigate("/student/certificates");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading && !resource.data)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (resource.error)
    return (
      <Page>
        <ErrorState message={resource.error} retry={resource.refresh} />
      </Page>
    );
  if (!lesson)
    return (
      <Page>
        <Empty
          icon={BookOpen}
          title="Your course is being prepared"
          description="There are no lessons available yet. Check back soon."
          action={<Button to="/student/courses">My learning</Button>}
        />
      </Page>
    );
  const { course, enrollment, modules } = resource.data;
  const module = modules.find((m) => m.id === lesson.moduleId);
  return (
    <Page>
      <PageHeading
        eyebrow={`MY LEARNING / ${course.level.toUpperCase()}`}
        title={course.title}
        description={`${enrollment.progress}% complete · ${modules.length} modules · ${lessons.length} lessons`}
        action={
          <Button to="/student/courses" variant="secondary">
            <ArrowLeft size={15} />
            My learning
          </Button>
        }
      />
      <Progress value={enrollment.progress} />
      <div style={{ height: 26 }} />
      <Button
        className="mobile-player-toggle"
        variant="secondary"
        onClick={() => setOutline(!outline)}
      >
        <PanelLeft size={17} />
        Course outline
      </Button>
      <div className="player-grid">
        <aside className={`player-outline card ${outline ? "open" : ""}`}>
          <div className="row">
            <h3>Your course roadmap</h3>
            <BookOpen size={16} color="#9d85d0" />
          </div>
          {modules.map((m, i) => (
            <div className="player-module" key={m.id}>
              <h4>
                0{i + 1} · {m.title}
              </h4>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  disabled={l.locked}
                  className={`lesson-link ${l.id === lesson.id ? "active" : ""} ${l.completed ? "done" : ""}`}
                  onClick={() => {
                    setSelected(l.id);
                    setOutline(false);
                  }}
                >
                  {l.completed ? (
                    <CheckCircle2 size={14} />
                  ) : l.locked ? (
                    <Lock size={14} />
                  ) : l.type === "quiz" ? (
                    <FileQuestion size={14} />
                  ) : l.type === "video" ? (
                    <Play size={14} />
                  ) : (
                    <BookOpen size={14} />
                  )}
                  <span>{l.title}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <section className="lesson-panel card">
          <Badge tone="blue">
            Module {modules.indexOf(module) + 1} · Lesson {lesson.order + 1}
          </Badge>
          <h2>{lesson.title}</h2>
          <div className="lesson-meta">
            {lesson.duration} min · {lesson.type}{" "}
            {lesson.completed && "· Completed"}
          </div>
          {advancing && (
            <div className="notice" role="status">
              Loading your next lesson…
            </div>
          )}
          {openError && (
            <div className="notice" role="alert">
              <p>{openError}</p>
              <Button
                variant="secondary"
                onClick={() => setOpenAttempt((attempt) => attempt + 1)}
              >
                Retry opening lesson
              </Button>
            </div>
          )}
          {lesson.type === "video" &&
            (lesson.videoUrl ? (
              <video
                controls
                className="lesson-video"
                src={lesson.videoUrl}
                onTimeUpdate={(e) => {
                  if (!e.target.paused) {
                    watchedPoints.current.add(Math.floor(e.target.currentTime));
                    setWatched(watchedPoints.current.size);
                  }
                }}
              />
            ) : (
              <div className="notice">
                Video content will appear once the instructor adds a playable
                video URL.
              </div>
            ))}
          {["image", "pdf"].includes(lesson.type) && (
            <LessonMedia lesson={lesson} />
          )}{" "}
          {["image", "pdf", "resource"].includes(lesson.type) &&
            resources.map((r) => (
              <Button
                key={r.url}
                variant="secondary"
                onClick={() =>
                  r.url.startsWith("/api/uploads/")
                    ? download(r.url, r.name).catch((e) =>
                        toast(e.message, "error"),
                      )
                    : window.open(r.url, "_blank", "noopener,noreferrer")
                }
              >
                <Download size={16} />
                {r.name}
              </Button>
            ))}
          {lesson.type === "quiz" ? (
            lesson.quiz ? (
              <Quiz
                key={lesson.id}
                quiz={lesson.quiz}
                ready={openedLesson === lesson.id}
                onPassed={() => {
                  setPassed(true);
                  resource.refresh();
                }}
              />
            ) : (
              <div className="notice">
                This quiz is being prepared. Contact support if you need help.
              </div>
            )
          ) : (
            <>
              <LessonContent content={lesson.content} />
              {(lesson.type === "exercise" ||
                lesson.type === "assignment" ||
                lesson.unlockRule === "exerciseSubmitted") && (
                <div className="lesson-exercise">
                  <Badge>PUT IT INTO PRACTICE</Badge>
                  <h3 style={{ marginTop: 12 }}>Make the idea your own.</h3>
                  <p>
                    Write a structured prompt for a real task in your field.
                    Explain how you would evaluate the result.
                  </p>
                  <Field label="Your response">
                    <textarea
                      value={exercise}
                      minLength={30}
                      maxLength={10000}
                      onChange={(e) => setExercise(e.target.value)}
                      rows={6}
                      placeholder="Describe your role, task, context, and expected output…"
                    />
                  </Field>
                  <span className="muted small-text">
                    {exercise.length} characters · minimum 30
                  </span>
                </div>
              )}
              {resources.length > 0 &&
                !["image", "pdf", "resource"].includes(lesson.type) && (
                  <div style={{ marginTop: 25 }}>
                    <h3>Lesson resources</h3>
                    {resources.map((r) => (
                      <button
                        key={r.url}
                        className="resource-link"
                        onClick={() =>
                          r.url.startsWith("/api/uploads/")
                            ? download(r.url, r.name).catch((e) =>
                                toast(e.message, "error"),
                              )
                            : window.open(
                                r.url,
                                "_blank",
                                "noopener,noreferrer",
                              )
                        }
                      >
                        <Download size={15} />
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
            </>
          )}
          <div className="lesson-nav">
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => setSelected(lessons[index - 1].id)}
            >
              <ArrowLeft size={15} />
              Previous
            </Button>
            {lesson.type === "quiz" ? (
              <Button
                disabled={
                  (!lesson.completed && !passed) ||
                  !next ||
                  next.locked ||
                  resource.loading
                }
                onClick={() => setSelected(next.id)}
              >
                Continue
                <ArrowRight size={15} />
              </Button>
            ) : lesson.completed ? (
              <Button
                disabled={!next || next.locked || resource.loading}
                onClick={() => setSelected(next.id)}
              >
                Next lesson
                <ArrowRight size={15} />
              </Button>
            ) : (
              <Button
                busy={busy || advancing || resource.loading}
                disabled={
                  openedLesson !== lesson.id ||
                  ((lesson.type === "exercise" ||
                    lesson.type === "assignment" ||
                    lesson.unlockRule === "exerciseSubmitted") &&
                    exercise.trim().length < 30)
                }
                onClick={complete}
              >
                Complete & continue
                <CheckCircle2 size={16} />
              </Button>
            )}
          </div>
          {enrollment.progress === 100 && (
            <div className="lesson-exercise">
              <h3>You’ve completed the lessons.</h3>
              <p>
                {course.projectRequired
                  ? "Submit your final project for review to earn your certificate."
                  : "Your next milestone is ready."}
              </p>
              <div className="row">
                {course.projectRequired && (
                  <Button to="/student/projects" variant="secondary">
                    Final project
                    <ArrowRight size={15} />
                  </Button>
                )}
                {course.certificateEnabled && (
                  <Button busy={busy} onClick={claim}>
                    Get my certificate
                  </Button>
                )}
                <Link to="/student/certificates" className="text-link">
                  View certificates
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
