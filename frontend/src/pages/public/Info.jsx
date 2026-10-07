import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Users,
  UserRound,
  Award,
  CheckCircle2,
} from "lucide-react";
import {
  Badge,
  Button,
  CheckList,
  Empty,
  ErrorState,
  Field,
  Loading,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { api } from "../../services/api";
export function Pricing() {
  const { data, loading, error, refresh } = useApi("/packages");
  return (
    <div className="container public-section">
      <div className="public-page-head" style={{ paddingTop: 0 }}>
        <div className="eyebrow">LEARN IN YOUR OWN WAY</div>
        <h1>
          A little investment.
          <br />
          <span className="gradient-text">A world of possibility.</span>
        </h1>
        <p>
          Find the support and pace that fit your goals. Pricing is illustrative
          until checkout and live scheduling are configured.
        </p>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="format-grid">
          {data?.map((p, i) => {
            const Icon = [BookOpen, Users, UserRound][i % 3];
            return (
              <div className="format-card card" key={p.id}>
                <Icon size={25} />
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="price-large">
                  ${p.price}
                  <small className="muted" style={{ fontSize: 12 }}>
                    {" "}
                    / month
                  </small>
                </div>
                <CheckList
                  items={[
                    "Practical AI course collection",
                    "Administrator-assigned learning path",
                    "AI Practice Lab & saved prompts",
                    i === 0
                      ? "Study on your schedule"
                      : i === 1
                        ? "Shared practice and guided discussion"
                        : "Focused personal guidance",
                  ]}
                />
                <Button
                  className="full"
                  variant={i === 1 ? "primary" : "secondary"}
                  to={i === 0 ? "/register" : "/contact"}
                >
                  {i === 0 ? "Start your journey" : "Ask about availability"}
                  <ArrowUpRight size={15} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <div className="notice" style={{ marginTop: 30 }}>
        No payment is collected in this version. Group sessions and coaching
        require confirmation from the team.
      </div>
    </div>
  );
}
export function About() {
  return (
    <div className="container public-section">
      <div
        className="public-page-head"
        style={{ maxWidth: 850, paddingTop: 0 }}
      >
        <div className="eyebrow">THE IDEA BEHIND Ai Learning Uni</div>
        <h1>
          The future should feel
          <br />
          <span className="gradient-text">like an invitation.</span>
        </h1>
        <p>
          AI is changing how we work, create, and learn. We believe everyone
          deserves a clear, practical way to understand it.
        </p>
      </div>
      <div className="format-grid">
        {[
          [
            "Practical from day one",
            "We start with the tasks you already do. Each lesson connects an idea to something useful in your work.",
          ],
          [
            "Built around people",
            "Your profession, experience, and ambitions shape the path. You bring the judgment; we help you build the skills.",
          ],
          [
            "Progress with purpose",
            "A thoughtful sequence of lessons, exercises, quizzes, and projects helps you turn curiosity into confidence.",
          ],
        ].map(([t, p]) => (
          <div className="format-card card" key={t}>
            <h3>{t}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <div className="corporate-banner" style={{ marginTop: 45 }}>
        <div>
          <div className="eyebrow">A WORLD OF STARTING POINTS</div>
          <h2>Wherever you are, start here.</h2>
          <p>
            From your first prompt to a practical AI workflow, there’s a next
            step for you.
          </p>
        </div>
        <Button to="/learning-path">
          Explore learning paths
          <ArrowUpRight size={17} />
        </Button>
      </div>
    </div>
  );
}
export function Contact({ portal = false }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const content = (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LET’S KEEP THE CONVERSATION GOING</div>
          <h1>
            {portal
              ? "We’re here to help."
              : "Good things start with a conversation."}
          </h1>
          <p>
            Ask about your learning journey, team training, or something on your
            mind.
          </p>
        </div>
      </div>
      <form
        className="form-card card"
        style={{ maxWidth: 700 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { data } = await api.post("/contact", form);
            setMessage(data.message);
            setForm({ name: "", email: "", message: "" });
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {[
            ["name", "Your name", "text"],
            ["email", "Email address", "email"],
          ].map(([key, label, type]) => (
            <Field key={key} label={label}>
              <input
                required
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
        <Field label="How can we help?">
          <textarea
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button busy={busy} type="submit">
          Send your request
          <ArrowUpRight size={16} />
        </Button>
        {message && (
          <p role="status" className="form-success">
            {message}
          </p>
        )}
      </form>
    </div>
  );

  return (
    <div className={portal ? "page-content" : "container public-section"}>
      {portal ? (
        content
      ) : (
        <div className="hero-grid" style={{ alignItems: "center" }}>
          {content}
          <div
            className="hero-visual"
            aria-label="An interconnected globe representing AI learning"
          >
            <span className="hero-coordinate">
              EXPLORING NEW POSSIBILITIES · 01 / ∞
            </span>
            <div className="orb-ring second" />
            <div className="atlas-orb">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="orb-latitude" />
              ))}
              <div className="orb-longitude" />
              <div className="orb-longitude" />
              <span className="orb-spark">✦</span>
            </div>
            <div className="orb-ring" />
            <div className="float-card one">
              <span>
                <BookOpen size={19} />
              </span>
              <div>
                Learn at your pace.<small>Courses and practical lessons</small>
              </div>
            </div>
            <div className="float-card two">
              <span>
                <Award size={20} />
              </span>
              <div>
                Build useful skills.<small>Projects. Practice. Progress.</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function PublicLearningPaths() {
  const paths = useApi("/learning-paths");
  return (
    <div className="container public-section">
      <div className="public-page-head" style={{ paddingTop: 0 }}>
        <div className="eyebrow">LEARNING PATHS</div>
        <h1>
          A clear sequence of <span className="gradient-text">skills.</span>
        </h1>
        <p>
          Explore our course pathways. Your administrator assigns the path for
          your learning journey.
        </p>
      </div>
      {paths.loading ? (
        <Loading />
      ) : paths.error ? (
        <ErrorState message={paths.error} retry={paths.refresh} />
      ) : !paths.data?.length ? (
        <Empty
          title="Learning paths are coming soon"
          description="Published pathways will appear here when available."
        />
      ) : (
        <div className="project-grid">
          {paths.data.map((path) => (
            <article key={path.id} id={path.id} className="project-card card">
              <Badge>{path.profession}</Badge>
              <h2 style={{ fontSize: 21, marginTop: 16 }}>{path.title}</h2>
              <p>{path.description}</p>
              <p className="small-text">
                {path.skillLevel} · {path.goal}
              </p>
              <ol style={{ paddingLeft: 20, marginTop: 20 }}>
                {path.courses.map((course) => (
                  <li key={course.id} style={{ marginBottom: 12 }}>
                    <Link className="text-link" to={"/courses/" + course.slug}>
                      {course.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function CertificateVerification() {
  const { certificateId } = useParams();
  const { data, loading, error } = useApi(`/certificates/${certificateId}`);
  return (
    <div className="container">
      <div className="verification card">
        {loading ? (
          <Loading />
        ) : error ? (
          <Empty
            icon={Award}
            title="Certificate could not be verified"
            description={error}
          />
        ) : (
          <>
            <CheckCircle2 size={45} />
            <Badge tone="green">Verified certificate</Badge>
            <h1>{data.studentName}</h1>
            <p>Successfully completed</p>
            <h2 style={{ marginTop: 15 }}>{data.courseTitle}</h2>
            <p>
              Issued {new Date(data.completionDate).toLocaleDateString("en-GB")}
            </p>
            <p className="small-text">Certificate ID: {data.id}</p>
            <Link className="text-link" to="/courses" style={{ marginTop: 30 }}>
              Find your own next chapter
              <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
