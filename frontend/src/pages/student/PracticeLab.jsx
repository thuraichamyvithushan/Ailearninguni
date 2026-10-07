import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Bookmark,
  Copy,
  FlaskConical,
  Save,
  Sparkles,
  Trash2,
  PenLine,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  Page,
  PageHeading,
  useToast,
} from "../../components/ui";
import { api } from "../../services/api";
import { useApi } from "../../hooks/useApi";
const example = {
  title: "A month of meaningful content",
  role: "An experienced marketing strategist",
  task: "Create a four-week content plan for a local café",
  context:
    "The café serves specialty coffee and brings the local community together. Our audience is busy professionals aged 25–45.",
  constraints:
    "Three posts per week. Friendly tone. No unverifiable claims. Focus on community, quality, and everyday moments.",
  outputFormat:
    "A table with week, theme, post idea, caption, and call to action",
};
function buildPrompt(form) {
  return `ROLE\nAct as ${form.role}.\n\nTASK\n${form.task}\n\nCONTEXT\n${form.context || "Ask clarifying questions if you need more context."}\n\nCONSTRAINTS\n${form.constraints || "Be accurate, protect confidential information, and state assumptions."}\n\nOUTPUT FORMAT\n${form.outputFormat}\n\nReview the response for accuracy and usefulness before using it.`;
}
export default function PracticeLab() {
  const location = useLocation();
  const existing = location.state?.prompt;
  const [form, setForm] = useState(existing || example);
  const [output, setOutput] = useState(
    existing?.content || buildPrompt(example),
  );
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const change = (key, value) => setForm({ ...form, [key]: value });
  async function save() {
    setBusy(true);
    try {
      if (existing?.id)
        await api.put(`/saved-prompts/${existing.id}`, {
          ...form,
          content: output,
        });
      else await api.post("/saved-prompts", { ...form, content: output });
      toast("Prompt saved to your collection.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <PageHeading
        eyebrow="A SPACE TO EXPERIMENT"
        title="Good prompts start with clear thinking."
        description="Turn an everyday task into a reusable prompt. Try it in your preferred AI tool."
        action={
          <Button to="/student/saved-prompts" variant="secondary">
            <Bookmark size={16} />
            Saved prompts
          </Button>
        }
      />
      <div className="lab-grid">
        <form
          className="form-card card"
          onSubmit={(e) => {
            e.preventDefault();
            setOutput(buildPrompt(form));
            toast("Your prompt is ready.");
          }}
        >
          <div className="section-card-header">
            <h2>Build your prompt</h2>
            <Badge tone="blue">5 ingredients</Badge>
          </div>
          <Field label="Prompt title">
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Field>
          <Field
            label="01 · Role"
            hint="What perspective or expertise would help?"
          >
            <input
              required
              maxLength={500}
              value={form.role}
              onChange={(e) => change("role", e.target.value)}
              placeholder="An experienced educator"
            />
          </Field>
          <Field
            label="02 · Task"
            hint="Be specific about the result you need."
          >
            <input
              required
              maxLength={500}
              value={form.task}
              onChange={(e) => change("task", e.target.value)}
            />
          </Field>
          <Field label="03 · Context">
            <textarea
              maxLength={10000}
              value={form.context}
              onChange={(e) => change("context", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="04 · Constraints">
            <textarea
              maxLength={5000}
              value={form.constraints}
              onChange={(e) => change("constraints", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="05 · Output format">
            <input
              required
              maxLength={500}
              value={form.outputFormat}
              onChange={(e) => change("outputFormat", e.target.value)}
            />
          </Field>
          <Button type="submit" className="full">
            <Sparkles size={16} />
            Build my prompt
          </Button>
        </form>
        <div>
          <div className="prompt-output card">
            <div className="row">
              <h2>Your prompt workspace</h2>
              <Badge>Editable</Badge>
            </div>
            <p style={{ fontSize: 11, marginTop: 10 }}>
              Refine your prompt, then copy or save it for later.
            </p>
            <textarea
              aria-label="Generated prompt"
              value={output}
              maxLength={20000}
              onChange={(e) => setOutput(e.target.value)}
            />
            <div className="form-actions">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(output);
                    toast("Prompt copied.");
                  } catch {
                    toast(
                      "Select the prompt text and copy it manually.",
                      "error",
                    );
                  }
                }}
              >
                <Copy size={16} />
                Copy prompt
              </Button>
              <Button busy={busy} disabled={!output.trim()} onClick={save}>
                <Save size={16} />
                {existing ? "Save changes" : "Save prompt"}
              </Button>
            </div>
          </div>
          <div className="prompt-hint">
            <FlaskConical size={17} style={{ marginBottom: 8 }} />
            <p>
              This lab builds structured prompts. It does not generate AI
              responses. Try your prompt in an AI tool, check the result, and
              refine what needs work.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
export function SavedPrompts() {
  const { data, loading, error, refresh } = useApi("/saved-prompts");
  const [remove, setRemove] = useState(null);
  const toast = useToast();
  return (
    <Page>
      <PageHeading
        eyebrow="YOUR COLLECTION OF GOOD IDEAS"
        title="Keep what works."
        description="A library of prompts you can return to, refine, and reuse."
        action={
          <Button to="/student/practice-lab">
            <Sparkles size={16} />
            Create a prompt
          </Button>
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="project-grid">
          {data.map((p) => (
            <div key={p.id} className="prompt-card card">
              <Badge>Reusable prompt</Badge>
              <h3>{p.title}</h3>
              <pre>{p.content}</pre>
              <div className="row">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(p.content);
                      toast("Prompt copied.");
                    } catch {
                      toast("Clipboard unavailable.", "error");
                    }
                  }}
                >
                  <Copy size={15} />
                  Copy
                </Button>
                <Link
                  className="text-link"
                  to="/student/practice-lab"
                  state={{ prompt: p }}
                >
                  <PenLine size={14} />
                  Edit
                </Link>
                <button
                  className="icon-button"
                  aria-label={`Delete ${p.title}`}
                  onClick={() => setRemove(p)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!data.length && (
            <Empty
              icon={Bookmark}
              title="Your next good idea belongs here"
              description="Build and save a prompt in the practice lab."
              action={<Button to="/student/practice-lab">Open the lab</Button>}
            />
          )}
        </div>
      )}
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this saved prompt?"
        onConfirm={async () => {
          try {
            await api.delete(`/saved-prompts/${remove.id}`);
            refresh();
            toast("Prompt deleted.");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </Page>
  );
}
