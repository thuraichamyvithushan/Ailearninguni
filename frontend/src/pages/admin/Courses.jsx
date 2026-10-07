import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  GripVertical,
  Layers,
  PenLine,
  Plus,
  Save,
  Trash2,
  Upload,
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
  SearchInput,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { api } from "../../services/api";
const blankCourse = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "other",
  instructorId: "instructor-samara",
  level: "Beginner",
  thumbnail: "",
  duration: "4 hours",
  price: 0,
  published: false,
  featured: false,
  sequentialLearning: true,
  certificateEnabled: true,
  projectRequired: false,
  prerequisites: [],
  learningOutcomes: [],
};
export function AdminCourses() {
  const { data, loading, error, refresh } = useApi("/admin/courses");
  const [query, setQuery] = useState("");
  const [remove, setRemove] = useState(null);
  const toast = useToast();
  const filtered = data?.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Page>
      <PageHeading
        eyebrow="THE COURSE COLLECTION"
        title="Build something worth learning."
        description="Create thoughtful courses and help your learners make meaningful progress."
        action={
          <Button to="/admin/courses/new">
            <Plus size={16} />
            Create course
          </Button>
        }
      />
      <div className="filters">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search your courses"
        />
        <span className="muted small-text">
          {filtered?.length || 0} courses
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : filtered.length ? (
        <div className="table-card card">
          <DataTable>
            <thead>
              <tr>
                <th>Course</th>
                <th>Level / field</th>
                <th>Price</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>
                      {c.duration} · {c.slug}
                    </small>
                  </td>
                  <td>
                    {c.level}
                    <small style={{ display: "block", marginTop: 5 }}>
                      {c.categoryId}
                    </small>
                  </td>
                  <td>{c.price ? `$${c.price}` : "Free"}</td>
                  <td>
                    <Badge tone={c.published ? "green" : "amber"}>
                      {c.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button
                        to={`/admin/courses/${c.id}/builder`}
                        variant="secondary"
                        className="compact"
                      >
                        <Layers size={13} />
                        Builder
                      </Button>
                      <Link
                        className="icon-button"
                        to={`/admin/courses/${c.id}/edit`}
                        aria-label={`Edit ${c.title}`}
                      >
                        <PenLine size={15} />
                      </Link>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${c.title}`}
                        onClick={() => setRemove(c)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      ) : (
        <Empty
          icon={BookOpen}
          title="Create your first course"
          description="A thoughtful course starts with a clear learning goal."
          action={<Button to="/admin/courses/new">New course</Button>}
        />
      )}
      <Confirm
        open={!!remove}
        title="Delete this course?"
        description="Courses with enrolled students are preserved. You can unpublish them instead."
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          try {
            await api.delete(`/admin/courses/${remove.id}`);
            refresh();
            toast("Course deleted.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
export function CourseEditor() {
  const { id } = useParams();
  const resource = useApi(id ? `/admin/courses/${id}` : null);
  const categories = useApi("/categories");
  const instructors = useApi("/admin/instructors");
  const [form, setForm] = useState(blankCourse);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  useEffect(() => {
    if (resource.data) setForm(resource.data);
  }, [resource.data]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  if (id && resource.loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (resource.error)
    return (
      <Page>
        <ErrorState message={resource.error} />
      </Page>
    );
  return (
    <Page>
      <PageHeading
        eyebrow="DESIGN A BETTER LEARNING EXPERIENCE"
        title={
          id
            ? "Give your course its shape."
            : "Your next great course starts here."
        }
        description="Set the direction, define the outcomes, and choose how learners move through the course."
        action={
          <Button to="/admin/courses" variant="secondary">
            <ArrowLeft size={15} />
            All courses
          </Button>
        }
      />
      <form
        className="form-card card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { data } = id
              ? await api.put(`/admin/courses/${id}`, form)
              : await api.post("/admin/courses", form);
            toast("Course saved.");
            navigate(`/admin/courses/${data.id}/builder`);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Course title">
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  ...(!id
                    ? {
                        slug: title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      }
                    : {}),
                }));
              }}
            />
          </Field>
          <Field
            label="URL slug"
            hint="Lowercase letters, numbers, and hyphens."
          >
            <input
              required
              pattern="(?:[a-z0-9]|-)+"
              value={form.slug}
              onChange={(e) => change("slug", e.target.value)}
            />
          </Field>
          <div className="wide">
            <Field label="Short description">
              <textarea
                required
                maxLength={500}
                rows={2}
                value={form.shortDescription}
                onChange={(e) => change("shortDescription", e.target.value)}
              />
            </Field>
          </div>
          <div className="wide">
            <Field label="Full description">
              <textarea
                maxLength={20000}
                rows={5}
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => change("categoryId", e.target.value)}
            >
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select
              value={form.level}
              onChange={(e) => change("level", e.target.value)}
            >
              {["Beginner", "Intermediate", "Advanced"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Instructor">
            <select
              value={form.instructorId}
              onChange={(e) => change("instructorId", e.target.value)}
            >
              {instructors.data?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated duration">
            <input
              required
              value={form.duration}
              onChange={(e) => change("duration", e.target.value)}
            />
          </Field>
          <Field label="Course price (USD)">
            <input
              required
              type="number"
              min={0}
              max={100000}
              value={form.price}
              onChange={(e) => change("price", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Thumbnail URL"
            hint="Use a public HTTPS image URL. A branded illustration appears when empty."
          >
            <input
              type="url"
              value={form.thumbnail}
              onChange={(e) => change("thumbnail", e.target.value)}
            />
          </Field>
          <Field label="Prerequisites" hint="One item per line.">
            <textarea
              value={form.prerequisites.join("\n")}
              onChange={(e) =>
                change("prerequisites", e.target.value.split("\n"))
              }
              onBlur={() =>
                change(
                  "prerequisites",
                  form.prerequisites.filter((s) => s.trim()),
                )
              }
            />
          </Field>
          <Field label="Learning outcomes" hint="One outcome per line.">
            <textarea
              value={form.learningOutcomes.join("\n")}
              onChange={(e) =>
                change("learningOutcomes", e.target.value.split("\n"))
              }
              onBlur={() =>
                change(
                  "learningOutcomes",
                  form.learningOutcomes.filter((s) => s.trim()),
                )
              }
            />
          </Field>
        </div>
        <div className="inline-options">
          {[
            ["published", "Published"],
            ["featured", "Featured"],
            ["sequentialLearning", "Sequential learning"],
            ["certificateEnabled", "Enable certificates"],
            ["projectRequired", "Require final project"],
          ].map(([key, label]) => (
            <label key={key} className="checkbox-field">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => change(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="submit" busy={busy}>
            <Save size={16} />
            Save & open course builder
          </Button>
        </div>
      </form>
    </Page>
  );
}
const blankLesson = {
  title: "",
  type: "text",
  description: "",
  content: "",
  videoUrl: "",
  duration: 10,
  order: 0,
  required: true,
  preview: false,
  unlockRule: "opened",
  resources: [],
};
export function CourseBuilder() {
  const { id } = useParams();
  const resource = useApi(`/admin/courses/${id}`);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  function edit(kind, record, moduleId) {
    setEditor({ kind, id: record?.id, moduleId });
    setForm(
      kind === "module"
        ? record || {
            title: "",
            description: "",
            order: resource.data.modules.length,
          }
        : {
            ...blankLesson,
            ...record,
            moduleId,
            order:
              record?.order ??
              resource.data.modules.find((m) => m.id === moduleId).lessons
                .length,
          },
    );
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint =
        editor.kind === "module"
          ? editor.id
            ? `/admin/modules/${editor.id}`
            : `/admin/courses/${id}/modules`
          : editor.id
            ? `/admin/lessons/${editor.id}`
            : `/admin/modules/${editor.moduleId}/lessons`;
      await api[editor.id ? "put" : "post"](endpoint, form);
      resource.refresh();
      setEditor(null);
      toast("Course content saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(items, index, direction, kind) {
    const other = items[index + direction];
    if (!other) return;
    try {
      await api.put(`/admin/${kind}/${items[index].id}`, {
        ...items[index],
        order: other.order,
      });
      await api.put(`/admin/${kind}/${other.id}`, {
        ...other,
        order: items[index].order,
      });
      resource.refresh();
      toast("Order updated.");
    } catch (e) {
      toast(e.message, "error");
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
  return (
    <Page>
      <PageHeading
        eyebrow="THE COURSE BUILDER"
        title={resource.data.title}
        description="A clear sequence of modules, lessons, and practice. Build it one step at a time."
        action={
          <div className="row">
            <Button to={`/admin/courses/${id}/edit`} variant="secondary">
              <PenLine size={15} />
              Details
            </Button>
            <Button onClick={() => edit("module")}>
              <Plus size={16} />
              Add module
            </Button>
          </div>
        }
      />
      <div className="notice">
        Use the arrows to reorder modules and lessons. Completed learner records
        are preserved when enrolled courses are edited. Video lessons require a
        directly playable video URL. Lesson text supports headings and numbered
        lists.
      </div>
      {resource.data.modules.map((m, i) => (
        <section className="builder-module card" key={m.id}>
          <div className="section-card-header">
            <h2>
              <span className="muted">0{i + 1}</span> · {m.title}
            </h2>
            <div className="table-actions">
              <button
                className="icon-button"
                disabled={i === 0}
                aria-label={`Move ${m.title} up`}
                onClick={() => reorder(resource.data.modules, i, -1, "modules")}
              >
                <ArrowUp size={15} />
              </button>
              <button
                className="icon-button"
                disabled={i === resource.data.modules.length - 1}
                aria-label={`Move ${m.title} down`}
                onClick={() => reorder(resource.data.modules, i, 1, "modules")}
              >
                <ArrowDown size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={`Edit ${m.title}`}
                onClick={() => edit("module", m)}
              >
                <PenLine size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${m.title}`}
                onClick={() => setRemove({ kind: "modules", record: m })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <p className="small-text muted" style={{ marginBottom: 20 }}>
            {m.description}
          </p>
          {m.lessons.map((l, j) => (
            <div className="builder-lesson" key={l.id}>
              <BookOpen size={17} />
              <div>
                <strong>{l.title}</strong>
                <small>
                  {l.type} · {l.duration} min ·{" "}
                  {l.required ? "Required" : "Optional"} · {l.unlockRule}
                </small>
              </div>
              <div className="table-actions">
                <button
                  className="icon-button"
                  disabled={j === 0}
                  onClick={() => reorder(m.lessons, j, -1, "lessons")}
                  aria-label={`Move ${l.title} up`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  disabled={j === m.lessons.length - 1}
                  onClick={() => reorder(m.lessons, j, 1, "lessons")}
                  aria-label={`Move ${l.title} down`}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => edit("lesson", l, m.id)}
                  aria-label={`Edit ${l.title}`}
                >
                  <PenLine size={14} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setRemove({ kind: "lessons", record: l })}
                  aria-label={`Delete ${l.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => edit("lesson", null, m.id)}
          >
            <Plus size={14} />
            Add lesson
          </Button>
        </section>
      ))}
      {!resource.data.modules.length && (
        <Empty
          icon={Layers}
          title="Every course starts with a first module"
          description="Add your first module, then shape its lessons and exercises."
          action={<Button onClick={() => edit("module")}>Add module</Button>}
        />
      )}
      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={`${editor?.id ? "Edit" : "Add"} ${editor?.kind}`}
      >
        {form && (
          <form onSubmit={save}>
            <Field label="Title">
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                maxLength={2000}
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            {editor?.kind === "lesson" && (
              <>
                <div className="form-grid">
                  <Field label="Lesson type">
                    <select
                      value={form.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setForm({
                          ...form,
                          type,
                          unlockRule:
                            type === "quiz"
                              ? "quizPassed"
                              : type === "video"
                                ? "videoWatched"
                                : ["exercise", "assignment"].includes(type)
                                  ? "exerciseSubmitted"
                                  : "opened",
                        });
                      }}
                    >
                      {[
                        "text",
                        "video",
                        "image",
                        "pdf",
                        "resource",
                        "exercise",
                        "quiz",
                        "assignment",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Duration (minutes)">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={form.duration}
                      onChange={(e) =>
                        setForm({ ...form, duration: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
                <Field
                  label="Lesson content"
                  hint="Use ## for headings, ### for subheadings, and numbered lists. Content is rendered as safe text."
                >
                  <div className="rich-toolbar">
                    {[
                      ["Heading", "\n\n## "],
                      ["Subheading", "\n\n### "],
                      ["Numbered list", "\n\n1. "],
                    ].map(([label, content]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, content: form.content + content })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={8}
                    maxLength={40000}
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                  />
                </Field>
                <Field label="Video URL">
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) =>
                      setForm({ ...form, videoUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Completion requirement">
                  <select
                    value={form.unlockRule}
                    onChange={(e) =>
                      setForm({ ...form, unlockRule: e.target.value })
                    }
                  >
                    {[
                      ["opened", "Lesson opened"],
                      ["videoWatched", "Video watched"],
                      ["exerciseSubmitted", "Exercise submitted"],
                      ["quizPassed", "Quiz passed"],
                    ].map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="inline-options">
                  {[
                    ["required", "Required lesson"],
                    ["preview", "Public preview"],
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
                <Field
                  label="Upload a lesson resource"
                  hint="Protected resources are downloaded through the authenticated API."
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
                        setForm((f) => ({
                          ...f,
                          resources: [
                            ...f.resources,
                            { name: data.name, url: data.url },
                          ],
                        }));
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </Field>
                {form.resources.map((r, i) => (
                  <div
                    key={r.url}
                    className="row"
                    style={{ fontSize: 11, marginBottom: 10 }}
                  >
                    <span>{r.name}</span>
                    <button
                      className="icon-button"
                      aria-label="Remove resource"
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          resources: form.resources.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {form.type === "quiz" && (
                  <p className="notice">
                    After saving this quiz lesson, add its questions in the
                    Quizzes section.
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditor(null)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                <Save size={15} />
                Save {editor?.kind}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title={`Delete this ${remove?.kind === "modules" ? "module" : "lesson"}?`}
        onConfirm={async () => {
          try {
            await api.delete(`/admin/${remove.kind}/${remove.record.id}`);
            resource.refresh();
            toast("Content deleted.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
