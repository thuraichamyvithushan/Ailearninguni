import { useState } from "react";
import {
  Award,
  Download,
  ExternalLink,
  FolderKanban,
  Plus,
  Save,
  Send,
  Upload,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Page,
  PageHeading,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { api, download } from "../../services/api";
const blank = {
  courseId: "",
  title: "",
  description: "",
  promptUsed: "",
  aiOutput: "",
  finalResult: "",
  reflection: "",
  attachment: "",
  status: "Draft",
};
export function Projects() {
  const projects = useApi("/my-projects");
  const learning = useApi("/my-courses");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  async function save(status) {
    setError("");
    setBusy(true);
    try {
      const payload = { ...form, status };
      if (form.id) await api.put(`/projects/${form.id}`, payload);
      else await api.post("/projects", payload);
      projects.refresh();
      setForm(null);
      toast(
        status === "Submitted"
          ? "Project submitted for review."
          : "Draft saved.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <PageHeading
        eyebrow="TURN KNOWLEDGE INTO SOMETHING REAL"
        title="Show what you can do."
        description="Create a practical project, reflect on your process, and get feedback."
        action={
          <Button
            onClick={() => {
              setError("");
              setForm({
                ...blank,
                courseId: learning.data?.[0]?.courseId || "",
              });
            }}
          >
            <Plus size={16} />
            New project
          </Button>
        }
      />
      {projects.loading ? (
        <Loading />
      ) : projects.error ? (
        <ErrorState message={projects.error} retry={projects.refresh} />
      ) : (
        <div className="project-grid">
          {projects.data.map((p) => (
            <article key={p.id} className="project-card card">
              <div className="row">
                <Badge
                  tone={
                    p.status === "Approved"
                      ? "green"
                      : p.status === "Changes Requested"
                        ? "amber"
                        : "violet"
                  }
                >
                  {p.status}
                </Badge>
                <FolderKanban size={19} color="#9b83cc" />
              </div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="muted small-text">
                {
                  learning.data?.find((e) => e.courseId === p.courseId)?.course
                    .title
                }
              </span>
              {p.feedback && (
                <div className="feedback-box">
                  <strong>Instructor feedback</strong>
                  <p style={{ marginTop: 6, color: "inherit" }}>{p.feedback}</p>
                </div>
              )}
              {p.attachment && (
                <button
                  className="resource-link"
                  onClick={() =>
                    download(p.attachment, "project-attachment").catch((e) =>
                      toast(e.message, "error"),
                    )
                  }
                >
                  <Download size={14} />
                  View attachment
                </button>
              )}
              <div style={{ marginTop: 20 }}>
                {["Draft", "Changes Requested"].includes(p.status) ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError("");
                      setForm(p);
                    }}
                  >
                    Continue project
                  </Button>
                ) : (
                  <span className="small-text muted">
                    {p.status === "Approved"
                      ? "Ready for your certificate."
                      : "Your project is with the review team."}
                  </span>
                )}
              </div>
            </article>
          ))}
          {!projects.data.length && (
            <Empty
              icon={FolderKanban}
              title="Your ideas, put into practice"
              description="Enroll in a course, then create a project that shows your new skills."
              action={<Button to="/student/courses">My learning</Button>}
            />
          )}
        </div>
      )}
      <Modal
        open={!!form}
        title={form?.id ? "Edit your project" : "Your next practical project"}
        onClose={() => setForm(null)}
      >
        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save("Submitted");
            }}
          >
            <Field label="Course">
              <select
                required
                value={form.courseId}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">Choose an enrolled course</option>
                {learning.data?.map((e) => (
                  <option key={e.courseId} value={e.courseId}>
                    {e.course.title}
                  </option>
                ))}
              </select>
            </Field>
            {[
              ["title", "Project title", false],
              ["description", "Project description", true],
              ["promptUsed", "Prompt you used", true],
              ["aiOutput", "AI output", true],
              ["finalResult", "Your final result", true],
              ["reflection", "What did you learn?", true],
            ].map(([key, label, area]) => (
              <Field key={key} label={label}>
                {area ? (
                  <textarea
                    required={[
                      "description",
                      "finalResult",
                      "reflection",
                    ].includes(key)}
                    minLength={
                      key === "description"
                        ? 20
                        : key === "finalResult"
                          ? 30
                          : key === "reflection"
                            ? 20
                            : undefined
                    }
                    rows={3}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    required
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                )}
              </Field>
            ))}
            <Field
              label="Project attachment"
              hint="PNG, JPEG, WebP, PDF, or text · maximum 10 MB"
            >
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
                onChange={async (e) => {
                  if (!e.target.files[0]) return;
                  setBusy(true);
                  try {
                    const body = new FormData();
                    body.append("file", e.target.files[0]);
                    const { data } = await api.post("/uploads", body);
                    setForm((f) => ({ ...f, attachment: data.url }));
                    toast("Attachment uploaded.");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              {form.attachment && <small>Attachment saved</small>}
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                busy={busy}
                onClick={() => save("Draft")}
              >
                <Save size={15} />
                Save draft
              </Button>
              <Button type="submit" busy={busy}>
                <Send size={15} />
                Submit project
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Page>
  );
}
export function Certificates() {
  const { data, loading, error, refresh } = useApi("/my-certificates");
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow="MILESTONES WORTH CELEBRATING"
        title="You earned this."
        description="Your completed courses, recognized with a verifiable certificate."
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="project-grid">
          {data.map((c) => (
            <div key={c.id} className="certificate-card card">
              <Award size={47} />
              <Badge tone={c.valid ? "green" : "amber"}>
                {c.valid ? "Verified achievement" : "Revoked"}
              </Badge>
              <h3>{c.courseTitle}</h3>
              <p>{c.studentName}</p>
              <p>
                Completed{" "}
                {new Date(c.completionDate).toLocaleDateString("en-GB")}
              </p>
              <p
                style={{ marginTop: 12, fontFamily: "monospace", fontSize: 10 }}
              >
                {c.id}
              </p>
              <div className="row">
                <Button
                  disabled={!c.valid}
                  variant="secondary"
                  onClick={() =>
                    download(`/certificates/${c.id}/pdf`, `${c.id}.pdf`).catch(
                      (e) => toast(e.message, "error"),
                    )
                  }
                >
                  <Download size={15} />
                  Download PDF
                </Button>
                <Button to={`/certificate/${c.id}`} variant="ghost">
                  <ExternalLink size={14} />
                  Verify
                </Button>
              </div>
            </div>
          ))}
          {!data.length && (
            <Empty
              icon={Award}
              title="Your next milestone is ahead"
              description="Complete the lessons, pass required quizzes, and get your final project approved where required. Claim your certificate from the completed course."
              action={<Button to="/student/courses">Continue learning</Button>}
            />
          )}
        </div>
      )}
    </Page>
  );
}
export function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow="YOUR LEARNING IDENTITY"
        title="Make yourself at home."
        description="Keep your profile and learning preferences up to date."
      />
      <div className="profile-grid">
        <form
          className="form-card card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api.put("/me", { name });
              await refresh();
              toast("Profile updated.");
            } catch (e) {
              toast(e.message, "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Your profile</h2>
          <Field label="Full name">
            <input
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label="Email address"
            hint="Your sign-in address is managed by your authentication provider."
          >
            <input disabled value={user.email} />
          </Field>
          <Button type="submit" busy={busy}>
            Save changes
          </Button>
        </form>
        <div className="form-card card">
          <h2>Your learning preferences</h2>
          {[
            ["Field", user.profession],
            ["AI level", user.aiLevel],
            ["Goal", user.goal],
            ["Format", user.learningStyle],
            ["Weekly time", user.weeklyStudyTime],
          ].map(([label, value]) => (
            <div
              key={label}
              className="row"
              style={{
                padding: "13px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
              }}
            >
              <span className="muted">{label}</span>
              <span>{value || "Not set"}</span>
            </div>
          ))}
          <Button
            to="/student/onboarding"
            variant="secondary"
            style={{ marginTop: 22 }}
          >
            Update learning preferences
          </Button>
        </div>
      </div>
    </Page>
  );
}
