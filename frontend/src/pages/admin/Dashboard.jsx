import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardList,
  Plus,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  ErrorState,
  Loading,
  Page,
  PageHeading,
  Progress,
  Stat,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
export function AnalyticsPanels({ data }) {
  const max = Math.max(1, ...data.growth.map((g) => g.count));
  return (
    <div className="admin-chart-grid">
      <section className="section-card card">
        <div className="section-card-header">
          <h2>Student growth</h2>
          <Badge tone="blue">Last 6 months</Badge>
        </div>
        <p className="muted small-text">New learners joining the journey.</p>
        <div
          className="chart"
          role="img"
          aria-label={data.growth
            .map((g) => `${g.month}: ${g.count} new students`)
            .join(", ")}
        >
          {data.growth.map((g) => (
            <div className="chart-column" key={g.month}>
              <strong>{g.count}</strong>
              <div
                className="chart-bar"
                style={{ height: `${(g.count / max) * 120}px` }}
              />
              <small>
                {new Date(`${g.month}-02`).toLocaleDateString("en-GB", {
                  month: "short",
                })}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="section-card card">
        <div className="section-card-header">
          <h2>Course completion</h2>
          <Badge tone="green">Live data</Badge>
        </div>
        <p className="muted small-text">Completed enrollments by course.</p>
        {data.popular.slice(0, 4).map((c) => (
          <div className="completion-row" key={c.title}>
            <div className="row">
              <span>{c.title}</span>
              <span className="muted">
                {c.completed}/{c.enrollments}
              </span>
            </div>
            <Progress
              value={c.enrollments ? (c.completed / c.enrollments) * 100 : 0}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
export default function AdminDashboard({ analytics = false }) {
  const { data, loading, error, refresh } = useApi("/admin/analytics");
  return (
    <Page>
      <PageHeading
        eyebrow="THE BIGGER PICTURE"
        title={
          analytics
            ? "Progress, in perspective."
            : "A good day to help people grow."
        }
        description="A live overview of your courses, learners, and their progress."
        action={
          <Button to="/admin/courses/new">
            <Plus size={16} />
            Create course
          </Button>
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              icon={Users}
              label="Total students"
              value={data.students}
              detail={`${data.active} active accounts`}
            />
            <Stat
              icon={BookOpen}
              label="Course collection"
              value={data.courses}
              detail="Published and draft courses"
            />
            <Stat
              icon={ClipboardList}
              label="Total enrollments"
              value={data.enrollments}
              detail={`${data.completionRate}% completion rate`}
            />
            <Stat
              icon={Award}
              label="Certificates issued"
              value={data.certificates}
              detail="Learning milestones recognized"
            />
          </div>
          <AnalyticsPanels data={data} />
          <div className="dashboard-bottom">
            <section className="section-card card">
              <div className="section-card-header">
                <h2>Recent registrations</h2>
                <Link className="text-link" to="/admin/students">
                  View students →
                </Link>
              </div>
              {data.recent.map((u) => (
                <div className="activity-item" key={u.id}>
                  <span className="avatar">{u.name[0]}</span>
                  <div>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </div>
                  <Badge tone="green">{u.status}</Badge>
                </div>
              ))}
              {!data.recent.length && (
                <p className="small-text muted">
                  New student registrations will appear here.
                </p>
              )}
            </section>
            <section className="section-card card">
              <div className="section-card-header">
                <h2>Popular courses</h2>
                <BookOpen size={18} color="#9b83c6" />
              </div>
              {[...data.popular]
                .sort((a, b) => b.enrollments - a.enrollments)
                .slice(0, 4)
                .map((c, i) => (
                  <div className="activity-item" key={c.title}>
                    <span className="roadmap-number">0{i + 1}</span>
                    <div>
                      <strong>{c.title}</strong>
                      <small>
                        {c.enrollments} enrolled · {c.completed} completed
                      </small>
                    </div>
                  </div>
                ))}
            </section>
          </div>
        </>
      )}
    </Page>
  );
}
