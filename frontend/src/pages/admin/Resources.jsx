import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, PenLine, Plus, Save, Trash2 } from "lucide-react";
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
import { api } from "../../services/api";
const configs = {
  categories: {
    title: "Organize the possibilities.",
    description:
      "Give learners a clear way to discover courses in their field.",
    collection: "categories",
    fields: [
      ["name", "Category name"],
      ["color", "Accent color"],
    ],
    blank: { name: "", color: "violet" },
  },
  "learning-paths": {
    title: "Give every journey a direction.",
    description:
      "Create course sequences, then assign them from each student's profile.",
    collection: "learningPaths",
    fields: [
      ["title", "Path title"],
      ["profession", "Profession"],
      ["skillLevel", "AI skill level"],
      ["goal", "Learning goal"],
      ["description", "Description", "textarea"],
    ],
    blank: {
      title: "",
      profession: "Marketing",
      skillLevel: "Beginner",
      goal: "Improve productivity",
      description: "",
      courseIds: [],
    },
  },
  instructors: {
    title: "The people who make learning possible.",
    description: "Manage educator profiles and course assignments.",
    collection: "instructors",
    fields: [
      ["name", "Instructor name"],
      ["email", "Email address", "email"],
      ["title", "Professional title"],
    ],
    blank: { name: "", email: "", title: "" },
  },
  packages: {
    title: "The right support for every learner.",
    description:
      "Manage your learning formats and illustrative package pricing.",
    collection: "packages",
    fields: [
      ["name", "Package name"],
      ["description", "Description", "textarea"],
      ["price", "Monthly price (USD)", "number"],
    ],
    blank: { name: "", description: "", price: 0, active: true },
  },
};
export function ResourceManager({ kind }) {
  const config = configs[kind];
  const resource = useApi(`/admin/${config.collection}`);
  const catalog = useApi(kind === "learning-paths" ? "/admin/courses" : null);
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow={kind.replace("-", " ").toUpperCase()}
        title={config.title}
        description={config.description}
        action={
          <Button
            onClick={() => {
              setError("");
              setForm({ ...config.blank });
            }}
          >
            <Plus size={16} />
            Add {kind === "learning-paths" ? "path" : kind.slice(0, -1)}
          </Button>
        }
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="project-grid">
          {resource.data.map((item) => (
            <div key={item.id} className="project-card card">
              <div className="row">
                <Badge>
                  {item.profession ||
                    item.color ||
                    (item.active === false ? "Draft" : kind.replace("-", " "))}
                </Badge>
                <div className="table-actions">
                  <button
                    className="icon-button"
                    aria-label="Edit record"
                    onClick={() => {
                      setError("");
                      setForm(item);
                    }}
                  >
                    <PenLine size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete record"
                    onClick={() => setRemove(item)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3>{item.title || item.name}</h3>
              <p>
                {item.description ||
                  item.email ||
                  `Discover ${item.name?.toLowerCase()} courses.`}
              </p>
              {item.skillLevel && (
                <p className="small-text">
                  {item.profession} · {item.skillLevel} · {item.goal}
                </p>
              )}
              {item.courseIds && (
                <p className="small-text">
                  {item.courseIds.length} courses in this pathway
                </p>
              )}
              {item.price !== undefined && (
                <strong style={{ fontSize: 23 }}>
                  ${item.price}
                  <span className="muted" style={{ fontSize: 11 }}>
                    {" "}
                    / month
                  </span>
                </strong>
              )}
            </div>
          ))}
          {!resource.data.length && (
            <Empty
              icon={Layers}
              title="Make a little room for a new idea"
              description="Create your first record to get started."
            />
          )}
        </div>
      )}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit record" : "Create a new record"}
      >
        {form && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api[form.id ? "put" : "post"](
                  `/admin/${config.collection}${form.id ? "/" + form.id : ""}`,
                  form,
                );
                resource.refresh();
                setForm(null);
                toast("Record saved.");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {config.fields.map(([key, label, type]) => (
              <Field key={key} label={label}>
                {type === "textarea" ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    required
                    type={type || "text"}
                    min={type === "number" ? 0 : undefined}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </Field>
            ))}
            {kind === "learning-paths" && (
              <Field
                label="Courses in order"
                hint="Select courses in the order you want learners to follow."
              >
                {catalog.data?.map((c) => (
                  <label className="checkbox-field" key={c.id}>
                    <input
                      type="checkbox"
                      checked={form.courseIds.includes(c.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          courseIds: e.target.checked
                            ? [...form.courseIds, c.id]
                            : form.courseIds.filter((id) => id !== c.id),
                        })
                      }
                    />
                    {form.courseIds.includes(c.id)
                      ? `${form.courseIds.indexOf(c.id) + 1}. `
                      : ""}
                    {c.title}
                  </label>
                ))}
              </Field>
            )}
            {kind === "packages" && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Active package
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button type="submit" busy={busy}>
                <Save size={15} />
                Save record
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          try {
            await api.delete(`/admin/${config.collection}/${remove.id}`);
            resource.refresh();
            toast("Record deleted.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
export function AdminEnrollments() {
  const resource = useApi("/admin/enrollments");
  const students = useApi("/admin/students");
  const courses = useApi("/admin/courses");
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow="LEARNING ACCESS"
        title="Connect people with possibilities."
        description="Manage student enrollments across the course collection."
        action={
          <Button onClick={() => setForm({ userId: "", courseId: "" })}>
            <Plus size={16} />
            Enroll student
          </Button>
        }
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
                <th>Learner</th>
                <th>Course</th>
                <th>Progress</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resource.data.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/admin/students/${e.userId}`}>
                      {students.data?.find((s) => s.id === e.userId)?.name ||
                        e.userId}
                    </Link>
                  </td>
                  <td>
                    {courses.data?.find((c) => c.id === e.courseId)?.title}
                  </td>
                  <td>{e.progress}%</td>
                  <td>
                    <Badge tone={e.status === "Completed" ? "green" : "violet"}>
                      {e.status}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label="Remove enrollment"
                      onClick={() => setRemove(e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {!resource.data.length && (
            <Empty
              title="No enrollments yet"
              description="Enroll a student to open their next chapter."
            />
          )}
        </div>
      )}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Enroll a student"
      >
        {form && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post("/admin/enrollments", form);
                setForm(null);
                resource.refresh();
                toast("Student enrolled.");
              } catch (e) {
                toast(e.message, "error");
              }
            }}
          >
            {[
              [
                "userId",
                "Student",
                students.data?.filter((s) => s.role === "student"),
              ],
              ["courseId", "Course", courses.data?.filter((c) => c.published)],
            ].map(([key, label, options]) => (
              <Field label={label} key={key}>
                <select
                  required
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                >
                  <option value="">Choose {label.toLowerCase()}</option>
                  {options?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name || o.title}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <Button type="submit">Enroll student</Button>
          </form>
        )}
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Remove this enrollment?"
        onConfirm={async () => {
          try {
            await api.delete(`/admin/enrollments/${remove.id}`);
            resource.refresh();
            toast("Enrollment removed.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
export function Settings() {
  const resource = useApi("/admin/settings");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (resource.data) setForm(resource.data);
  }, [resource.data]);
  return (
    <Page>
      <PageHeading
        eyebrow="PLATFORM PREFERENCES"
        title="The details that keep things running."
        description="Manage your platform identity and support contact."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        form && (
          <form
            className="form-card card"
            style={{ maxWidth: 700 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api.put("/admin/settings", form);
                toast("Settings saved.");
              } catch (e) {
                toast(e.message, "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Platform name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Support email">
              <input
                type="email"
                required
                value={form.supportEmail}
                onChange={(e) =>
                  setForm({ ...form, supportEmail: e.target.value })
                }
              />
            </Field>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.certificateEnabled}
                onChange={(e) =>
                  setForm({ ...form, certificateEnabled: e.target.checked })
                }
              />
              Enable platform certificates
            </label>
            <Button type="submit" busy={busy}>
              Save settings
            </Button>
          </form>
        )
      )}
    </Page>
  );
}
export function AdminSupport() {
  const resource = useApi("/admin/supportRequests");
  return (
    <Page>
      <PageHeading
        eyebrow="LEARNER SUPPORT"
        title="Keep the conversation going."
        description="Contact requests submitted through the public site and student portal."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="notification-list">
          {resource.data.map((r) => (
            <article className="card" key={r.id}>
              <div className="row">
                <h3 style={{ fontSize: 15 }}>{r.name}</h3>
                <Badge>{r.status}</Badge>
              </div>
              <p>{r.message}</p>
              <span className="muted small-text">
                {r.email} · {new Date(r.createdAt).toLocaleDateString("en-GB")}
              </span>
            </article>
          ))}
          {!resource.data.length && (
            <Empty
              title="No requests waiting"
              description="New support requests will appear here."
            />
          )}
        </div>
      )}
    </Page>
  );
}
