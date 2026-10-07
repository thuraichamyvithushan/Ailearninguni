import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Plus,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import {
  DataTable,
  Badge,
  Button,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Page,
  PageHeading,
  Progress,
  SearchInput,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
export function Students() {
  const { data, loading, error, refresh } = useApi("/admin/students");
  const enrollments = useApi("/admin/enrollments");
  const [query, setQuery] = useState("");
  const filtered = data?.filter(
    (u) =>
      u.role === "student" &&
      `${u.name} ${u.email} ${u.profession || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Page>
      <PageHeading
        eyebrow="PEOPLE AT THE HEART OF LEARNING"
        title="Every learner has a next chapter."
        description="Understand your students, support their progress, and manage their learning access."
      />
      <div className="filters">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search students or profession"
        />
        <span className="muted small-text">
          {filtered?.length || 0}{" "}
          {filtered?.length === 1 ? "student" : "students"}
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="table-card card">
          <DataTable>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Field / level</th>
                <th>Courses / progress</th>
                <th>Status</th>
                <th>Joined / last active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const courses =
                  enrollments.data?.filter((e) => e.userId === u.id) || [];
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      {u.profession || "Not set"}
                      <small style={{ display: "block", marginTop: 5 }}>
                        {u.aiLevel || "—"}
                      </small>
                    </td>
                    <td>
                      {courses.length} courses
                      <small style={{ display: "block", marginTop: 5 }}>
                        {courses.length
                          ? Math.round(
                              courses.reduce((s, c) => s + c.progress, 0) /
                                courses.length,
                            )
                          : 0}
                        % average
                      </small>
                    </td>
                    <td>
                      <Badge tone={u.status === "active" ? "green" : "amber"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td>
                      {new Date(u.createdAt).toLocaleDateString("en-GB")}
                      <small style={{ display: "block", marginTop: 5 }}>
                        {u.lastActivityAt
                          ? new Date(u.lastActivityAt).toLocaleDateString(
                              "en-GB",
                            )
                          : "No recent activity"}
                      </small>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        to={`/admin/students/${u.id}`}
                      >
                        View profile →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          {!filtered.length && (
            <Empty
              icon={Users}
              title="No matching learners"
              description="Try a different search term."
            />
          )}
        </div>
      )}
    </Page>
  );
}
export function StudentDetail() {
  const { id } = useParams();
  const resource = useApi(`/admin/students/${id}`);
  const catalog = useApi("/admin/courses");
  const paths = useApi("/admin/learningPaths");
  const [learningPathId, setLearningPathId] = useState("");
  useEffect(() => {
    if (resource.data)
      setLearningPathId(
        resource.data.learningPathAssignedBy
          ? resource.data.learningPathId || ""
          : "",
      );
  }, [resource.data]);
  const { user } = useAuth();
  const [enroll, setEnroll] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function mutate(url, body, method = "post") {
    setBusy(true);
    try {
      await api[method](url, body);
      toast("Learner records updated.");
      resource.refresh();
      return true;
    } catch (e) {
      toast(e.message, "error");
      return false;
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
  const u = resource.data;
  return (
    <Page>
      <PageHeading
        eyebrow="LEARNER PROFILE"
        title={u.name}
        description={u.email}
        action={
          <Button to="/admin/students" variant="secondary">
            <ArrowLeft size={15} />
            All learners
          </Button>
        }
      />
      <div className="profile-grid">
        <section className="section-card card">
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Profile & access</h2>
          {[
            ["Field", u.profession],
            ["AI level", u.aiLevel],
            ["Goal", u.goal],
            ["Account status", u.status],
            ["Role", u.role],
          ].map(([label, value]) => (
            <div
              className="row"
              style={{ padding: "13px 0", fontSize: 12 }}
              key={label}
            >
              <span className="muted">{label}</span>
              <span>{value || "Not set"}</span>
            </div>
          ))}
          {u.id !== user.id && (
            <>
              <Button
                variant="secondary"
                style={{ marginTop: 15 }}
                onClick={() =>
                  setAction({
                    title:
                      u.status === "active"
                        ? "Suspend this account?"
                        : "Reactivate this account?",
                    url: `/admin/students/${id}`,
                    method: "put",
                    body: {
                      status: u.status === "active" ? "suspended" : "active",
                    },
                  })
                }
              >
                {u.status === "active"
                  ? "Suspend account"
                  : "Reactivate account"}
              </Button>
              {user.role === "superadmin" && (
                <Field
                  label="Change role"
                  hint="Role changes invalidate the current session. The user must sign in again."
                >
                  <select
                    value={u.role}
                    onChange={(e) =>
                      setAction({
                        title: `Change this user to ${e.target.value}?`,
                        url: `/admin/students/${id}`,
                        method: "put",
                        body: { role: e.target.value },
                      })
                    }
                  >
                    {["student", "instructor", "admin", "superadmin"].map(
                      (r) => (
                        <option key={r}>{r}</option>
                      ),
                    )}
                  </select>
                </Field>
              )}
            </>
          )}
          {u.role === "student" && (
            <form
              style={{ marginTop: 24 }}
              onSubmit={async (e) => {
                e.preventDefault();
                await mutate(
                  `/admin/students/${id}/learning-path`,
                  { learningPathId },
                  "put",
                );
              }}
            >
              <Field
                label="Assigned learning path"
                hint="Create a path in Learning paths, then assign it here. Student preference changes keep this assignment."
              >
                <select
                  value={learningPathId}
                  disabled={paths.loading || !!paths.error || busy}
                  onChange={(e) => setLearningPathId(e.target.value)}
                >
                  <option value="">No assigned path</option>
                  {paths.data?.map((path) => (
                    <option key={path.id} value={path.id}>
                      {path.title}
                    </option>
                  ))}
                </select>
              </Field>
              {paths.error && <p className="form-error">{paths.error}</p>}
              <Button
                type="submit"
                variant="secondary"
                busy={busy}
                disabled={paths.loading || !!paths.error}
              >
                Save path assignment
              </Button>
            </form>
          )}
        </section>
        <section className="section-card card">
          <div className="section-card-header">
            <h2>Course enrollments</h2>
            {u.role === "student" && (
              <Button className="compact" onClick={() => setEnroll(true)}>
                <Plus size={14} />
                Enroll
              </Button>
            )}
          </div>
          {u.enrollments.map((e) => (
            <div key={e.id} style={{ marginBottom: 25 }}>
              <h3 style={{ fontSize: 13 }}>
                {catalog.data?.find((c) => c.id === e.courseId)?.title ||
                  e.courseId}
              </h3>
              <div className="row progress-caption">
                <span>{e.status}</span>
                <span>{e.progress}%</span>
              </div>
              <Progress value={e.progress} />
              <div className="table-actions" style={{ marginTop: 10 }}>
                <Button
                  variant="ghost"
                  className="compact"
                  onClick={() =>
                    setAction({
                      title: "Reset this course progress?",
                      url: `/admin/enrollments/${e.id}/reset`,
                    })
                  }
                >
                  <RotateCcw size={13} />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  className="compact"
                  onClick={() =>
                    setAction({
                      title: "Remove this enrollment?",
                      url: `/admin/enrollments/${e.id}`,
                      method: "delete",
                    })
                  }
                >
                  <X size={13} />
                  Remove
                </Button>
                <Button
                  className="compact"
                  variant="secondary"
                  busy={busy}
                  onClick={() =>
                    mutate("/admin/certificates", {
                      userId: id,
                      courseId: e.courseId,
                    })
                  }
                >
                  <Award size={13} />
                  Certificate
                </Button>
              </div>
            </div>
          ))}
          {!u.enrollments.length && (
            <p className="small-text muted">No enrollments yet.</p>
          )}
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="section-card card">
          <h2 style={{ fontSize: 18 }}>Quiz results</h2>
          {u.quizAttempts.map((a) => (
            <div className="activity-item" key={a.id}>
              <div>
                <strong>{a.quizId}</strong>
                <small>
                  {a.score}% · {a.passed ? "Passed" : "Needs review"}
                </small>
              </div>
            </div>
          ))}
          {!u.quizAttempts.length && (
            <p className="small-text muted" style={{ marginTop: 15 }}>
              Quiz attempts will appear here.
            </p>
          )}
        </section>
        <section className="section-card card">
          <h2 style={{ fontSize: 18 }}>Projects & certificates</h2>
          {u.projects.map((p) => (
            <div className="activity-item" key={p.id}>
              <div>
                <strong>{p.title}</strong>
                <small>{p.status}</small>
              </div>
            </div>
          ))}
          {u.certificates.map((c) => (
            <div className="activity-item" key={c.id}>
              <Award size={16} />
              <div>
                <strong>{c.courseTitle}</strong>
                <small>{c.id}</small>
              </div>
            </div>
          ))}
          {!u.projects.length && !u.certificates.length && (
            <p className="small-text muted" style={{ marginTop: 15 }}>
              New achievements will appear here.
            </p>
          )}
        </section>
      </div>
      <section className="section-card card" style={{ marginTop: 25 }}>
        <h2 style={{ fontSize: 18 }}>Learning activity</h2>
        {u.activityLogs
          .slice(-10)
          .reverse()
          .map((a) => (
            <div className="activity-item" key={a.id}>
              <BookOpen size={15} />
              <div>
                <strong>{a.message}</strong>
                <small>{new Date(a.createdAt).toLocaleString("en-GB")}</small>
              </div>
            </div>
          ))}
        {!u.activityLogs.length && (
          <p className="small-text muted" style={{ marginTop: 15 }}>
            No recorded activity yet.
          </p>
        )}
      </section>
      <Modal
        open={enroll}
        onClose={() => setEnroll(false)}
        title="Give this learner a next step"
      >
        <Field label="Course">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Choose a course</option>
            {catalog.data
              ?.filter((c) => c.published)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </Field>
        <Button
          busy={busy}
          disabled={!courseId}
          onClick={async () => {
            if (await mutate("/admin/enrollments", { userId: id, courseId }))
              setEnroll(false);
          }}
        >
          Enroll student
        </Button>
      </Modal>
      <Confirm
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.title}
        description="This changes the learner’s account or course access. Confirm to continue."
        onConfirm={() =>
          mutate(action.url, action.body, action.method || "post")
        }
      />
    </Page>
  );
}
