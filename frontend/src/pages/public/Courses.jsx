import { useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ArrowRight, BookOpen, Clock, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  CheckList,
  CourseArt,
  CourseCard,
  Empty,
  ErrorState,
  Loading,
  SearchInput,
  useToast,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
export function Courses() {
  const { data, loading, error, refresh } = useApi("/courses");
  const categories = useApi("/categories");
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const category = params.get("category") || "All";
  function setCategory(value) {
    const next = new URLSearchParams(params);
    if (value === "All") next.delete("category");
    else next.set("category", value);
    setParams(next, { replace: true });
  }
  const filtered = data?.filter(
    (c) =>
      (category === "All" || c.categoryId === category) &&
      `${c.title} ${c.shortDescription} ${c.level}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="container" style={{ paddingBottom: 75 }}>
      <div className="public-page-head">
        <div className="eyebrow">THE COURSE COLLECTION</div>
        <h1>
          Make room for <span className="gradient-text">what’s next.</span>
        </h1>
        <p>
          Build skills that stay with you. Practical AI courses for your field,
          your goals, and your next chapter.
        </p>
      </div>
      <div className="filters">
        <div className="filter-pills">
          {[{ id: "All", name: "All" }, ...(categories.data || [])].map((c) => (
            <button
              key={c.id}
              className={`filter-pill ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Find your next course"
        />
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <div className="course-grid">
          {filtered?.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
          {!filtered?.length && (
            <Empty
              title="No courses found"
              description="Try another field or search term."
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                  variant="secondary"
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
export function CourseDetail() {
  const { slug } = useParams();
  const course = useApi(`/courses/${slug}`);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function enroll() {
    if (!user)
      return navigate("/login", { state: { from: `/courses/${slug}` } });
    if (user.role !== "student")
      return toast("Sign in with a student account to enroll.", "error");
    setBusy(true);
    try {
      await api.post(`/courses/${course.data.id}/enroll`);
      toast("You’re enrolled. Your next chapter starts now.");
      navigate(`/student/course/${course.data.id}`);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (course.loading)
    return (
      <div className="container public-section">
        <Loading />
      </div>
    );
  if (course.error)
    return (
      <div className="container public-section">
        <ErrorState message={course.error} retry={course.refresh} />
      </div>
    );
  const c = course.data;
  return (
    <div className="container public-section course-detail-grid">
      <div className="course-detail">
        <Link className="text-link" to="/courses">
          ← All courses
        </Link>
        <div style={{ marginTop: 24 }}>
          <Badge>{c.categoryName || c.categoryId}</Badge>
        </div>
        <h1>{c.title}</h1>
        <p>{c.shortDescription}</p>
        <div className="detail-stats">
          <span>
            <BookOpen size={14} /> {c.level}
          </span>
          <span>
            <Clock size={14} /> {c.duration}
          </span>
          <span>
            <UserRound size={14} /> {c.instructor || "Ai Learning Uni educator"}
          </span>
        </div>
        <h2>What you’ll take away</h2>
        <CheckList items={c.learningOutcomes} />
        <h2 style={{ marginTop: 35 }}>Your course, step by step.</h2>
        <p>{c.description}</p>
        {c.modules.map((m, i) => (
          <div className="curriculum-preview card" key={m.id}>
            <h3>
              0{i + 1} · {m.title}
            </h3>
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <span>
                    {l.title} {l.preview && <Badge tone="green">Preview</Badge>}
                  </span>
                  <span>
                    {l.duration} min · {l.type}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <aside className="course-purchase card">
        <CourseArt course={c} />
        <div className="price-large">
          {c.price === 0 ? "Free" : `$${c.price}`}
        </div>
        <Button className="full" busy={busy} onClick={enroll}>
          Start learning
          <ArrowRight size={17} />
        </Button>
        {c.price > 0 && (
          <p className="small-text">
            Preview enrollment is available without checkout. Payment processing
            is not enabled.
          </p>
        )}
        <CheckList
          items={[
            "Learn at your own pace",
            "Practical exercises & resources",
            ...(c.certificateEnabled
              ? ["Verifiable completion certificate"]
              : []),
            ...(c.projectRequired ? ["Final project with feedback"] : []),
          ]}
        />
        {c.prerequisites?.length > 0 && (
          <p className="small-text">
            Recommended first: {c.prerequisites.join(", ")}
          </p>
        )}
      </aside>
    </div>
  );
}
