import { Link, Navigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Check,
  Award,
  Clock,
  FlaskConical,
  Lock,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  Badge,
  Button,
  CourseArt,
  Empty,
  ErrorState,
  Loading,
  Page,
  PageHeading,
  Progress,
  Stat,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
export function Roadmap({ courses = [] }) {
  let locked = false;
  return (
    <ol className="roadmap-list">
      {courses.map((course, i) => {
        const done = course.enrollment?.status === "Completed";
        const isLocked = locked;
        locked = locked || !done;
        return (
          <li
            key={course.id}
            className={`roadmap-item ${done ? "done" : isLocked ? "locked" : ""}`}
          >
            <span className="roadmap-number">
              {done ? (
                <Check size={15} />
              ) : isLocked ? (
                <Lock size={12} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <strong>{course.title}</strong>
              <small>
                {done
                  ? "Completed"
                  : isLocked
                    ? "Up next"
                    : course.enrollment
                      ? "Your current focus"
                      : "Ready to start"}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const dashboard = useApi("/dashboard");
  const learning = useApi("/my-courses");
  const path = useApi("/learning-path");
  const catalog = useApi("/courses");
  if (!user.onboardingCompleted)
    return <Navigate to="/student/onboarding" replace />;
  if (dashboard.loading || learning.loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (dashboard.error || learning.error)
    return (
      <Page>
        <ErrorState
          message={dashboard.error || learning.error}
          retry={() => {
            dashboard.refresh();
            learning.refresh();
          }}
        />
      </Page>
    );
  const stats = dashboard.data;
  const current =
    learning.data.find((e) => e.status !== "Completed") || learning.data[0];
  const next = catalog.data?.find(
    (c) => !learning.data.some((e) => e.courseId === c.id),
  );
  return (
    <Page>
      <PageHeading
        eyebrow="EVERY STEP COUNTS"
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="A little progress today. A little more possibility tomorrow."
        action={
          <Badge tone="green">
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            Your journey is underway
          </Badge>
        }
      />
      <div className="stats-grid">
        <Stat
          icon={BookOpen}
          label="Courses enrolled"
          value={stats.enrolled}
          detail="Your active learning collection"
        />
        <Stat
          icon={CheckCircle2}
          label="Courses completed"
          value={stats.completed}
          detail="Skills that move you forward"
        />
        <Stat
          icon={Award}
          label="Certificates earned"
          value={stats.certificates}
          detail="Milestones worth celebrating"
        />
        <Stat
          icon={Clock}
          label="Learning hours"
          value={`${stats.hours}h`}
          detail="Estimated completed lesson time"
        />
      </div>
      <div className="dashboard-grid">
        {current ? (
          <div className="continue-card card">
            <div className="row">
              <div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div>
              <Badge tone="cyan">{current.status}</Badge>
            </div>
            <div className="continue-course">
              <div>
                <h2>{current.course.title}</h2>
                <p>{current.course.shortDescription}</p>
                <Badge>{current.course.level} · Self-paced</Badge>
              </div>
              <CourseArt course={current.course} small />
            </div>
            <div className="row progress-caption">
              <span>Your course progress</span>
              <strong>{current.progress}% complete</strong>
            </div>
            <Progress value={current.progress} />
            <Button to={`/student/course/${current.courseId}`}>
              {current.status === "Completed"
                ? "Review your course"
                : "Continue learning"}
              <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <Empty
            icon={BookOpen}
            title="Your first chapter is waiting"
            description="Choose a course and take your first step."
            action={
              <Button to="/courses">
                Explore courses
                <ArrowUpRight size={16} />
              </Button>
            }
          />
        )}
        <div className="section-card card">
          <div className="section-card-header">
            <h2>Your assigned learning path</h2>
            <Link className="text-link" to="/student/learning-path">
              View path
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {path.loading ? (
            <p className="small-text muted">Finding your next steps…</p>
          ) : path.error ? (
            <p className="small-text muted">{path.error}</p>
          ) : !path.data ? (
            <Empty
              title="No path assigned yet"
              description="Your administrator will assign a learning path. You can start with a course from the catalog."
              action={
                <Button to="/courses" variant="secondary">
                  Explore courses
                </Button>
              }
            />
          ) : (
            <>
              <p className="small-text muted" style={{ marginBottom: 24 }}>
                {path.data.title}
              </p>
              <Roadmap courses={path.data?.courses} />
            </>
          )}
        </div>
      </div>
      <div className="dashboard-bottom">
        <div className="section-card card">
          <div className="section-card-header">
            <h2>Your recent progress</h2>
            <Badge tone="blue">Activity</Badge>
          </div>
          {stats.activity.length ? (
            stats.activity.map((a) => (
              <div key={a.id} className="activity-item">
                <span className="activity-icon">
                  <CheckCircle2 size={16} />
                </span>
                <div>
                  <strong>{a.message}</strong>
                  <small>
                    {new Date(a.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · Keep moving forward
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="activity-item">
              <span className="activity-icon">
                <Activity size={16} />
              </span>
              <div>
                <strong>Your learning journey is ready.</strong>
                <small>Complete a lesson to see your progress here.</small>
              </div>
            </div>
          )}
          {next && (
            <div className="activity-item" style={{ paddingTop: 20 }}>
              <span className="activity-icon">
                <BookOpen size={16} />
              </span>
              <div>
                <strong>Recommended next: {next.title}</strong>
                <small>
                  <Link to={`/courses/${next.slug}`} className="text-link">
                    Explore course
                    <ArrowUpRight size={12} />
                  </Link>
                </small>
              </div>
            </div>
          )}
        </div>
        <div className="lab-callout card">
          <FlaskConical size={27} />
          <Badge>THE PRACTICE LAB</Badge>
          <h3 style={{ marginTop: 15 }}>Ideas get better with practice.</h3>
          <p>
            Turn a task from your day into a useful prompt. Experiment, refine,
            and save what works.
          </p>
          <Button variant="secondary" to="/student/practice-lab">
            Try something new
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
    </Page>
  );
}
