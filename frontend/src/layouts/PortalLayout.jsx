import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  BookOpen,
  Route,
  FlaskConical,
  FolderKanban,
  Award,
  Bookmark,
  UserRound,
  LifeBuoy,
  Users,
  Layers,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Package,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { Brand, Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { authMode } from "../services/firebase";
const studentNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["courses", "My learning", BookOpen],
  ["learning-path", "Learning path", Route],
  ["practice-lab", "Practice lab", FlaskConical],
  ["projects", "My projects", FolderKanban],
  ["certificates", "Certificates", Award],
  ["saved-prompts", "Saved prompts", Bookmark],
  ["profile", "My profile", UserRound],
  ["support", "Help & support", LifeBuoy],
];
const adminNav = [
  ["", "Overview", LayoutDashboard],
  ["students", "Students", Users],
  ["courses", "Courses", BookOpen],
  ["categories", "Categories", Layers],
  ["learning-paths", "Learning paths", Route],
  ["enrollments", "Enrollments", ClipboardList],
  ["quizzes", "Quizzes", FileQuestion],
  ["projects", "Project reviews", FolderKanban],
  ["certificates", "Certificates", Award],
  ["instructors", "Instructors", GraduationCap],
  ["packages", "Packages", Package],
  ["analytics", "Analytics", ChartNoAxesCombined],
  ["settings", "Settings", Settings],
  ["support", "Support requests", LifeBuoy],
];
export default function PortalLayout({ admin = false }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width:900px)").matches,
  );
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width:900px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (open && mobile) sidebarRef.current?.querySelector("button")?.focus();
  }, [open, mobile]);
  function closeSidebar() {
    setOpen(false);
    toggleRef.current?.focus();
  }
  const location = useLocation();
  const navigate = useNavigate();
  const base = admin ? "/admin" : "/student";
  const nav = admin ? adminNav : studentNav;
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const title =
    nav.find(
      ([path]) =>
        location.pathname === `${base}/${path}` ||
        (admin && !path && location.pathname === base),
    )?.[1] || "Course workspace";
  return (
    <div className="portal">
      <button
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside
        ref={sidebarRef}
        className={`sidebar ${open ? "open" : ""}`}
        inert={mobile && !open}
        onKeyDown={(event) => {
          if (!mobile || !open) return;
          if (event.key === "Escape") closeSidebar();
          if (event.key === "Tab") {
            const items = [
              ...sidebarRef.current.querySelectorAll("a,button"),
            ].filter((item) => item.offsetParent !== null);
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-toggle"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          {admin ? "MANAGEMENT WORKSPACE" : "YOUR LEARNING SPACE"}
        </div>
        <nav aria-label={admin ? "Admin navigation" : "Student navigation"}>
          {nav.map(([path, label, Icon], i) => (
            <NavLink
              key={path}
              to={`${base}${path ? "/" + path : ""}`}
              end={i === 0}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === "practice-lab" && <Badge tone="blue">NEW</Badge>}
            </NavLink>
          ))}
        </nav>
        {!admin && (
          <div className="sidebar-tip">
            <span>✦ YOUR NEXT CHAPTER</span>
            <h3>
              A little practice.
              <br />A big difference.
            </h3>
            <p>Put your skills to work in the AI Practice Lab.</p>
            <Link to="/student/practice-lab">
              Open practice lab
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
        <div className="sidebar-user">
          <span className="avatar">
            {user?.name
              ?.split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{user?.name}</strong>
            <small>{admin ? "Administrator" : "Lifelong learner"}</small>
          </div>
          <button
            title="Log out"
            className="icon-button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            aria-label="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="portal-main" inert={mobile && open}>
        <header className="portal-header">
          <div className="row">
            <button
              className="icon-button mobile-toggle"
              onClick={() => setOpen(true)}
              ref={toggleRef}
              aria-expanded={open}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              {admin ? "Admin portal" : "Student portal"} <span>/</span>{" "}
              <strong>{title}</strong>
            </span>
          </div>
          <div className="row">
            {authMode === "demo" && <Badge tone="amber">Local demo</Badge>}
            <Link className="portal-explore" to="/courses">
              Explore courses
              <ArrowUpRight size={15} />
            </Link>
            {!admin && (
              <Link
                to="/student/notifications"
                className="icon-button"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </Link>
            )}
            <span className="avatar small-avatar">{user?.name?.[0]}</span>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
