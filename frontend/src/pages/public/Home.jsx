import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers,
  Package,
  Route,
  Award,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Badge,
  Button,
  SectionHeading,
  CourseCard,
  Loading,
  ErrorState,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";

function ManagedSection({
  resource,
  title,
  eyebrow,
  children,
  action,
  alternate = false,
}) {
  if (!resource.loading && !resource.error && !resource.data?.length)
    return null;
  return (
    <section className={`public-section${alternate ? " alt" : ""}`}>
      <div className="container">
        <SectionHeading eyebrow={eyebrow} title={title} action={action} />
        {resource.loading ? (
          <Loading />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.refresh} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const courses = useApi("/courses");
  const categories = useApi("/categories");
  const paths = useApi("/learning-paths");
  const packages = useApi("/packages");
  const instructors = useApi("/instructors");
  const reduced = useReducedMotion();
  const categoryById = new Map(
    categories.data?.map((category) => [category.id, category]) || [],
  );
  const publishedCourses = [...(courses.data || [])].sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-pill">
              <span />
              YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1>
              Learn AI for
              <br />
              the way <span className="gradient-text">you work.</span>
            </h1>
            <p className="hero-description">
              Explore our courses, build practical AI skills, and learn at your
              own pace.
            </p>
            <div className="hero-buttons">
              <Button to="/courses">
                Explore courses
                <ArrowUpRight size={17} />
              </Button>
              <Button variant="secondary" to="/register">
                Get started
                <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
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
      </section>

      <ManagedSection
        resource={categories}
        eyebrow="EXPLORE BY CATEGORY"
        title="Find a course for your interests."
      >
        <div className="field-grid">
          {categories.data?.map((category) => (
            <Link
              key={category.id}
              to={`/courses?category=${encodeURIComponent(category.id)}`}
              className="field-card"
            >
              <span className="field-icon">
                <Layers size={20} />
              </span>
              <strong>{category.name}</strong>
              <ChevronRight size={17} />
            </Link>
          ))}
        </div>
      </ManagedSection>

      <ManagedSection
        resource={courses}
        eyebrow="THE COURSE COLLECTION"
        title="Your next skill starts here."
        alternate
        action={
          <Button to="/courses" variant="secondary">
            All courses
            <ArrowUpRight size={15} />
          </Button>
        }
      >
        <div className="course-grid">
          {publishedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={{
                ...course,
                categoryName: categoryById.get(course.categoryId)?.name,
              }}
            />
          ))}
        </div>
      </ManagedSection>

      <ManagedSection
        resource={paths}
        eyebrow="LEARNING PATHS"
        title="A clear sequence of courses."
      >
        <div className="project-grid">
          {paths.data?.map((path) => (
            <article key={path.id} className="project-card card">
              <Badge>{path.profession}</Badge>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <p className="small-text">
                {path.skillLevel} · {path.courses.length} courses
              </p>
              <Button variant="secondary" to={`/learning-path#${path.id}`}>
                View path
                <Route size={15} />
              </Button>
            </article>
          ))}
        </div>
      </ManagedSection>

      <ManagedSection
        resource={packages}
        eyebrow="LEARNING PACKAGES"
        title="Explore your learning options."
        alternate
      >
        <div className="format-grid">
          {packages.data?.map((item) => (
            <article key={item.id} className="format-card card">
              <Package size={25} />
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div className="price-large">
                ${item.price}
                <small className="muted" style={{ fontSize: 12 }}>
                  {" "}
                  / month
                </small>
              </div>
              <Button variant="secondary" to="/contact">
                Ask about this package
                <ArrowUpRight size={15} />
              </Button>
            </article>
          ))}
        </div>
      </ManagedSection>

      <ManagedSection
        resource={instructors}
        eyebrow="OUR INSTRUCTORS"
        title="Meet your educators."
      >
        <div className="project-grid">
          {instructors.data?.map((instructor) => (
            <article key={instructor.id} className="project-card card">
              <GraduationCap size={25} />
              <h3>{instructor.name}</h3>
              <p>{instructor.title}</p>
            </article>
          ))}
        </div>
      </ManagedSection>
    </>
  );
}
