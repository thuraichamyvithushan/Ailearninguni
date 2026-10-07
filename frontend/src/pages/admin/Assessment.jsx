import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Download,
  ExternalLink,
  FileQuestion,
  FolderKanban,
  PenLine,
  Plus,
  Save,
  Trash2,
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
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { api, download } from "../../services/api";
function question() {
  return {
    id: crypto.randomUUID(),
    type: "multiple-choice",
    question: "",
    options: ["", ""],
    correctAnswers: [0],
    explanation: "",
    points: 1,
  };
}
export function AdminQuizzes() {
  const resource = useApi("/admin/quizzes");
  const catalog = useApi("/admin/courses");
  const [courseDetail, setCourseDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(null);
  const toast = useToast();
  async function edit(q) {
    setForm(
      q || {
        courseId: "",
        lessonId: "",
        title: "",
        passingPercentage: 70,
        maxAttempts: 3,
        randomize: true,
        showExplanation: true,
        questions: [question()],
      },
    );
    setError("");
    setCourseDetail(null);
    if (q?.courseId)
      try {
        setCourseDetail((await api.get(`/admin/courses/${q.courseId}`)).data);
      } catch (e) {
        setError(e.message);
      }
  }
  function changeQuestion(index, key, value) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === index ? { ...q, [key]: value } : q,
      ),
    }));
  }
  return (
    <Page>
      <PageHeading
        eyebrow="CHECK UNDERSTANDING. BUILD CONFIDENCE."
        title="Make knowledge stick."
        description="Create quizzes with clear questions, useful explanations, and meaningful pass requirements."
        action={
          <Button onClick={() => edit()}>
            <Plus size={16} />
            Create quiz
          </Button>
        }
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="project-grid">
          {resource.data.map((q) => (
            <article key={q.id} className="project-card card">
              <div className="row">
                <Badge tone="blue">{q.questions.length} questions</Badge>
                <button
                  className="icon-button"
                  aria-label="Edit quiz"
                  onClick={() => edit(q)}
                >
                  <PenLine size={16} />
                </button>
              </div>
              <h3>{q.title}</h3>
              <p>{catalog.data?.find((c) => c.id === q.courseId)?.title}</p>
              <div className="row">
                <span className="muted small-text">
                  Pass: {q.passingPercentage}% · {q.maxAttempts} attempts
                </span>
                <button
                  className="icon-button"
                  aria-label="Delete quiz"
                  onClick={() => setRemove(q)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!resource.data.length && (
            <Empty
              icon={FileQuestion}
              title="A thoughtful question goes a long way"
              description="Add a quiz lesson in a course builder, then create its questions here."
            />
          )}
        </div>
      )}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit quiz" : "Create a knowledge check"}
      >
        {form && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api[form.id ? "put" : "post"](
                  `/admin/quizzes${form.id ? "/" + form.id : ""}`,
                  form,
                );
                resource.refresh();
                setForm(null);
                toast("Quiz saved.");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Quiz title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Course">
                <select
                  required
                  value={form.courseId}
                  onChange={async (e) => {
                    const courseId = e.target.value;
                    setForm({ ...form, courseId, lessonId: "" });
                    setCourseDetail(null);
                    if (courseId)
                      try {
                        setCourseDetail(
                          (await api.get(`/admin/courses/${courseId}`)).data,
                        );
                      } catch (e) {
                        setError(e.message);
                      }
                  }}
                >
                  <option value="">Choose a course</option>
                  {catalog.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quiz lesson">
                <select
                  required
                  value={form.lessonId}
                  onChange={(e) =>
                    setForm({ ...form, lessonId: e.target.value })
                  }
                >
                  <option value="">Choose a quiz lesson</option>
                  {courseDetail?.modules
                    .flatMap((m) => m.lessons)
                    .filter((l) => l.type === "quiz")
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Passing percentage">
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={form.passingPercentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      passingPercentage: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Maximum attempts">
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={form.maxAttempts}
                  onChange={(e) =>
                    setForm({ ...form, maxAttempts: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="inline-options">
              {[
                ["randomize", "Randomize questions"],
                ["showExplanation", "Show explanations"],
              ].map(([key, label]) => (
                <label key={key} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            {form.questions.map((q, i) => (
              <div key={q.id} className="quiz-editor-question">
                <div className="row" style={{ marginBottom: 20 }}>
                  <h3>Question {i + 1}</h3>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={form.questions.length === 1}
                    aria-label="Delete question"
                    onClick={() =>
                      setForm({
                        ...form,
                        questions: form.questions.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <Field label="Question">
                  <input
                    required
                    value={q.question}
                    onChange={(e) =>
                      changeQuestion(i, "question", e.target.value)
                    }
                  />
                </Field>
                <Field label="Question type">
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setForm((f) => ({
                        ...f,
                        questions: f.questions.map((item, j) =>
                          j === i
                            ? {
                                ...item,
                                type,
                                options:
                                  type === "true-false"
                                    ? ["True", "False"]
                                    : item.options,
                                correctAnswers: [0],
                              }
                            : item,
                        ),
                      }));
                    }}
                  >
                    {[
                      ["multiple-choice", "Multiple choice"],
                      ["true-false", "True / false"],
                      ["multiple-select", "Multiple select"],
                    ].map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="small-text muted" style={{ marginBottom: 13 }}>
                  Choose the correct answer
                  {q.type === "multiple-select" ? "s" : ""} using the controls.
                </p>
                {q.options.map((option, j) => (
                  <div key={j} className="row" style={{ marginBottom: 10 }}>
                    <input
                      style={{ width: 18 }}
                      type={q.type === "multiple-select" ? "checkbox" : "radio"}
                      name={`correct-${q.id}`}
                      checked={q.correctAnswers.includes(j)}
                      aria-label={`Option ${j + 1} is correct`}
                      onChange={() =>
                        changeQuestion(
                          i,
                          "correctAnswers",
                          q.type === "multiple-select"
                            ? q.correctAnswers.includes(j)
                              ? q.correctAnswers.filter((a) => a !== j)
                              : [...q.correctAnswers, j]
                            : [j],
                        )
                      }
                    />
                    <input
                      required
                      aria-label={`Option ${j + 1}`}
                      value={option}
                      disabled={q.type === "true-false"}
                      onChange={(e) =>
                        changeQuestion(
                          i,
                          "options",
                          q.options.map((value, index) =>
                            index === j ? e.target.value : value,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {q.type !== "true-false" && q.options.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="compact"
                    onClick={() =>
                      changeQuestion(i, "options", [...q.options, ""])
                    }
                  >
                    <Plus size={14} />
                    Add option
                  </Button>
                )}
                <Field label="Explanation">
                  <textarea
                    value={q.explanation}
                    onChange={(e) =>
                      changeQuestion(i, "explanation", e.target.value)
                    }
                    rows={2}
                  />
                </Field>
                <Field label="Points">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={q.points}
                    onChange={(e) =>
                      changeQuestion(i, "points", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
            ))}
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                setForm({ ...form, questions: [...form.questions, question()] })
              }
            >
              <Plus size={14} />
              Add question
            </Button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button type="submit" busy={busy}>
                <Save size={15} />
                Save quiz
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this quiz?"
        onConfirm={async () => {
          try {
            await api.delete(`/admin/quizzes/${remove.id}`);
            resource.refresh();
            toast("Quiz deleted.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
export function ProjectReviews({ endpoint = "/admin/projects" }) {
  const resource = useApi(endpoint);
  const [project, setProject] = useState(null);
  const [review, setReview] = useState({
    status: "Under Review",
    feedback: "",
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow="FEEDBACK THAT MOVES PEOPLE FORWARD"
        title="Good work deserves a thoughtful review."
        description="Review learner projects, offer useful feedback, and recognize progress."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="project-grid">
          {resource.data
            .filter((p) => p.status !== "Draft")
            .map((p) => (
              <article className="project-card card" key={p.id}>
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
                  <span className="small-text muted">{p.studentName}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setProject(p);
                    setReview({
                      status: [
                        "Under Review",
                        "Changes Requested",
                        "Approved",
                      ].includes(p.status)
                        ? p.status
                        : "Under Review",
                      feedback: p.feedback || "",
                    });
                  }}
                >
                  Review submission
                </Button>
              </article>
            ))}
          {!resource.data.some((p) => p.status !== "Draft") && (
            <Empty
              icon={FolderKanban}
              title="No projects waiting for review"
              description="Submitted projects will appear here when learners are ready."
            />
          )}
        </div>
      )}
      <Modal
        open={!!project}
        onClose={() => setProject(null)}
        title={project?.title}
      >
        {project && (
          <>
            <Badge>{project.studentName}</Badge>
            {[
              ["description", "Project description"],
              ["promptUsed", "Prompt used"],
              ["aiOutput", "AI output"],
              ["finalResult", "Final result"],
              ["reflection", "Reflection"],
            ].map(([key, label]) => (
              <section key={key} style={{ marginTop: 23 }}>
                <h3 style={{ fontSize: 13 }}>{label}</h3>
                <p
                  style={{ fontSize: 12, whiteSpace: "pre-wrap", marginTop: 8 }}
                >
                  {project[key] || "Not provided"}
                </p>
              </section>
            ))}
            {project.attachment && (
              <Button
                variant="secondary"
                style={{ marginTop: 20 }}
                onClick={() =>
                  download(project.attachment, "project-attachment").catch(
                    (e) => toast(e.message, "error"),
                  )
                }
              >
                <Download size={15} />
                Download attachment
              </Button>
            )}
            <form
              style={{ marginTop: 30 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api.put(`/admin/projects/${project.id}/review`, review);
                  resource.refresh();
                  setProject(null);
                  toast("Project review saved.");
                } catch (e) {
                  toast(e.message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Review outcome">
                <select
                  value={review.status}
                  onChange={(e) =>
                    setReview({ ...review, status: e.target.value })
                  }
                >
                  {["Under Review", "Changes Requested", "Approved"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Your feedback">
                <textarea
                  required
                  minLength={5}
                  maxLength={5000}
                  value={review.feedback}
                  onChange={(e) =>
                    setReview({ ...review, feedback: e.target.value })
                  }
                  rows={4}
                />
              </Field>
              <Button type="submit" busy={busy}>
                Save review
              </Button>
            </form>
          </>
        )}
      </Modal>
    </Page>
  );
}
export function AdminCertificates() {
  const resource = useApi("/admin/certificates");
  return (
    <Page>
      <PageHeading
        eyebrow="RECOGNIZE MEANINGFUL PROGRESS"
        title="Learning milestones, made visible."
        description="Certificates are issued after the learner meets course requirements. Issue an eligible certificate from their student profile."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="table-card card">
          <DataTable>
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Certificate ID</th>
                <th>Issued</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resource.data.map((c) => (
                <tr key={c.id}>
                  <td>{c.studentName}</td>
                  <td>{c.courseTitle}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.id}</td>
                  <td>
                    {new Date(c.completionDate).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    <Badge tone={c.valid ? "green" : "amber"}>
                      {c.valid ? "Valid" : "Revoked"}
                    </Badge>
                  </td>
                  <td>
                    <Link className="text-link" to={`/certificate/${c.id}`}>
                      Verify
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {!resource.data.length && (
            <Empty
              icon={Award}
              title="The next milestone is ahead"
              description="Eligible certificates will appear here as learners complete their courses."
            />
          )}
        </div>
      )}
    </Page>
  );
}
