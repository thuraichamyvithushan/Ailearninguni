import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Lock, Route } from "lucide-react";
import {
  Badge,
  Button,
  CourseCard,
  Empty,
  ErrorState,
  Loading,
  Page,
  PageHeading,
  Progress,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
export function MyLearning() {
  const { data, loading, error, refresh } = useApi("/my-courses");
  const [tab, setTab] = useState("All courses");
  const filtered = data?.filter(
    (e) =>
      tab === "All courses" ||
      (tab === "In progress"
        ? e.status !== "Completed"
        : e.status === "Completed"),
  );
  return (
    <Page>
      <PageHeading
        eyebrow="YOUR GROWING COLLECTION"
        title="A little more capable, every day."
        description="Pick up a course, build a skill, and keep your momentum."
        action={
          <Button to="/courses" variant="secondary">
            Find a new course
            <ArrowRight size={15} />
          </Button>
        }
      />
      <div className="tab-strip">
        {["All courses", "In progress", "Completed"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}{" "}
            {data && (
              <span className="muted">
                (
                {
                  data.filter(
                    (e) =>
                      t === "All courses" ||
                      (t === "In progress"
                        ? e.status !== "Completed"
                        : e.status === "Completed"),
                  ).length
                }
                )
              </span>
            )}
          </button>
        ))}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="course-grid">
          {filtered.map((e) => (
            <CourseCard key={e.id} course={e.course} enrollment={e} />
          ))}
          {!filtered.length && (
            <Empty
              icon={BookOpen}
              title="Make space for your next skill"
              description="Your courses will appear here once you enroll."
              action={<Button to="/courses">Explore courses</Button>}
            />
          )}
        </div>
      )}
    </Page>
  );
}
export function LearningPath() {
  const { data, loading, error, refresh } = useApi("/learning-path");
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  async function start(c) {
    setBusy(c.id);
    try {
      await api.post(`/courses/${c.id}/enroll`);
      navigate(`/student/course/${c.id}`);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy("");
    }
  }
  let prerequisiteDone = true;
  return (
    <Page>
      <PageHeading
        eyebrow="YOUR ASSIGNED LEARNING PATH"
        title="One step closer to your goals."
        description="Follow the course sequence assigned by your administrator."
        action={
          <Button to="/student/onboarding" variant="secondary">
            Update my goals
          </Button>
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : !data ? (
        <Empty
          icon={Route}
          title="No learning path assigned yet"
          description="Your administrator will assign a learning path. You can explore individual courses in the meantime."
          action={<Button to="/courses">Explore courses</Button>}
        />
      ) : !data.courses.length ? (
        <Empty
          icon={Route}
          title={data.title}
          description="The courses in your assigned path are not available yet. Contact support for help."
          action={<Button to="/student/support">Contact support</Button>}
        />
      ) : (
        <div className="learning-path-grid">
          <div>
            {data.courses.map((c, i) => {
              const done = c.enrollment?.status === "Completed";
              const available = prerequisiteDone;
              prerequisiteDone = prerequisiteDone && done;
              return (
                <div key={c.id} className="path-card card">
                  <span className="roadmap-number">
                    {done ? (
                      <Check size={20} />
                    ) : !available ? (
                      <Lock size={17} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div className="path-info">
                    <Badge
                      tone={done ? "green" : available ? "violet" : "blue"}
                    >
                      {done
                        ? "Completed"
                        : available
                          ? "Your current focus"
                          : "Up next"}
                    </Badge>
                    <h3>{c.title}</h3>
                    <p>
                      {c.duration} · {c.level}
                    </p>
                    {c.enrollment && (
                      <div style={{ marginTop: 15 }}>
                        <Progress value={c.enrollment.progress} />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!available && !done}
                    busy={busy === c.id}
                    onClick={() =>
                      c.enrollment
                        ? navigate(`/student/course/${c.id}`)
                        : start(c)
                    }
                  >
                    {done
                      ? "Review"
                      : c.enrollment
                        ? "Continue"
                        : "Start course"}
                    <ArrowRight size={15} />
                  </Button>
                </div>
              );
            })}
            <div className="notice">
              Your administrator has set this course order. You can also explore
              and enroll in individual courses from the catalog.
            </div>
          </div>
          <aside className="section-card card" style={{ alignSelf: "start" }}>
            <div className="eyebrow">YOUR LEARNING PROFILE</div>
            <h2 style={{ fontSize: 20, marginBottom: 24 }}>{data.title}</h2>
            {[
              ["Your field", user.profession],
              ["Experience", user.aiLevel],
              ["Your goal", user.goal],
              ["Learning style", user.learningStyle],
              ["Weekly study time", user.weeklyStudyTime],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div className="muted small-text">{label}</div>
                <strong
                  style={{ fontSize: 12, display: "block", marginTop: 6 }}
                >
                  {value}
                </strong>
              </div>
            ))}
            <p className="small-text">{data.description}</p>
          </aside>
        </div>
      )}
    </Page>
  );
}
export function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({
    profession: user.profession || "Marketing",
    aiLevel: user.aiLevel || "New to AI",
    goal: user.goal || "Improve productivity",
    learningStyle: user.learningStyle || "Self-paced",
    weeklyStudyTime: user.weeklyStudyTime || "2–5 hours",
  });
  const steps = [
    [
      "profession",
      "What field are you in?",
      "Start with what matters to your work.",
      [
        "Marketing",
        "Business",
        "Law",
        "Technology",
        "Education",
        "Student",
        "Other",
      ],
    ],
    [
      "aiLevel",
      "Where are you starting?",
      "There’s a good next step at every level.",
      ["New to AI", "Beginner", "Intermediate", "Advanced"],
    ],
    [
      "goal",
      "What would you like to achieve?",
      "Choose the goal that matters most right now.",
      [
        "Improve productivity",
        "Learn prompt engineering",
        "Automate tasks",
        "Advance my career",
        "Build AI applications",
        "Improve research",
        "Create content",
      ],
    ],
    [
      "learningStyle",
      "How do you like to learn?",
      "Choose the format that fits your life.",
      ["Self-paced", "Group", "One-to-one"],
    ],
    [
      "weeklyStudyTime",
      "Make a little room for progress.",
      "How much time would you like to study each week?",
      ["Less than 2 hours", "2–5 hours", "5–10 hours", "10+ hours"],
    ],
  ];
  const [key, title, description, options] = steps[step];
  async function next() {
    if (step < 4) return setStep(step + 1);
    setBusy(true);
    try {
      await api.post("/onboarding", answers);
      await refresh();
      toast("Your learning preferences are saved.");
      navigate("/student/dashboard");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <div className="eyebrow">LET’S MAKE THIS YOURS</div>
      <h1>Tell us about your learning goals.</h1>
      <p>
        Your administrator can use these preferences to assign your learning
        path.
      </p>
      <div className="onboarding-steps">
        <span>Step {step + 1} of 5</span>
        <span>{(step + 1) * 20}%</span>
      </div>
      <Progress value={(step + 1) * 20} />
      <div className="card">
        <h2>{title}</h2>
        <p style={{ fontSize: 12, margin: "12px 0 25px" }}>{description}</p>
        <div className="onboarding-options">
          {options.map((option) => (
            <button
              key={option}
              aria-pressed={answers[key] === option}
              className={`onboarding-option ${answers[key] === option ? "selected" : ""}`}
              onClick={() => setAnswers({ ...answers, [key]: option })}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="form-actions">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button busy={busy} onClick={next}>
            {step === 4 ? "Save preferences" : "Continue"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
