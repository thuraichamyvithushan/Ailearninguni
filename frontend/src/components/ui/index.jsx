import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Orbit,
  Plus,
  Search,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, type = "success") => setToast({ message, type })}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          <CheckCircle2 size={18} />
          {toast.message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Ai Learning Uni home" style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
      <img 
        src="/logo.png" 
        alt="Ai Learning Uni" 
        style={{ height: "110px", width: "auto", margin: "-35px 0 -35px -15px", maxWidth: "none" }} 
      />
    </Link>
  );
}
export function Button({
  children,
  to,
  variant = "primary",
  busy = false,
  className = "",
  ...props
}) {
  const cls = `button ${variant} ${className}`;
  return to ? (
    <Link className={cls} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button {...props} className={cls} disabled={busy || props.disabled}>
      {busy && <Loader2 size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Badge({ children, tone = "violet" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Progress({ value = 0 }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function Page({ children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="page-content"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="stat card">
      <span className="stat-icon">
        <Icon size={20} />
      </span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Empty({
  icon: Icon = Plus,
  title = "Nothing here yet",
  description,
  action,
}) {
  return (
    <div className="empty card">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeleton-grid" aria-label="Loading content" role="status">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <Empty
      title="We couldn’t load this"
      description={message}
      action={
        retry && (
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        )
      }
    />
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  let assigned = false;
  function associate(nodes) {
    return Children.map(nodes, (child) => {
      if (!isValidElement(child) || typeof child.type !== "string")
        return child;
      if (["input", "textarea", "select"].includes(child.type) && !assigned) {
        assigned = true;
        return cloneElement(child, {
          id,
          "aria-describedby": hint
            ? `${id}-hint`
            : child.props["aria-describedby"],
        });
      }
      return child.props.children
        ? cloneElement(child, {}, associate(child.props.children))
        : child;
    });
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {associate(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
export function Modal({ open, onClose, title, children }) {
  const ref = useRef();
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title = "Delete this item?",
  description = "This action cannot be undone.",
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p>{description}</p>
      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
export function CourseArt({ course, small = false }) {
  return (
    <div
      className={`course-art ${course.color || "violet"} ${small ? "small" : ""}`}
    >
      <span className="art-grid" />
      <span className="art-orbit orbit-one" />
      <span className="art-orbit orbit-two" />
      <Orbit className="art-symbol" size={small ? 38 : 64} />
      <span className="art-label">
        Ai Learning Uni / {course.categoryId?.toUpperCase() || "LEARNING"}
      </span>
      <span className="art-stars">✦</span>
    </div>
  );
}
export function CourseCard({ course, enrollment }) {
  return (
    <article className="course-card card">
      <Link
        to={
          enrollment
            ? `/student/course/${course.id}`
            : `/courses/${course.slug}`
        }
        aria-label={course.title}
      >
        {course.thumbnail ? (
          <img className="course-thumbnail" src={course.thumbnail} alt="" />
        ) : (
          <CourseArt course={course} />
        )}
      </Link>
      <div className="course-card-body">
        <div className="row">
          <Badge tone={course.color || "violet"}>
            {course.categoryName || course.categoryId}
          </Badge>
          <span className="muted small-text">{course.level}</span>
        </div>
        <h3>
          <Link
            to={
              enrollment
                ? `/student/course/${course.id}`
                : `/courses/${course.slug}`
            }
          >
            {course.title}
          </Link>
        </h3>
        <p>{course.shortDescription}</p>
        {enrollment ? (
          <>
            <div className="row progress-caption">
              <span>{enrollment.status}</span>
              <strong>{enrollment.progress}%</strong>
            </div>
            <Progress value={enrollment.progress} />
            <Button
              to={`/student/course/${course.id}`}
              variant="secondary"
              className="full"
            >
              {enrollment.status === "Completed"
                ? "Review course"
                : "Continue learning"}
              <ChevronRight size={16} />
            </Button>
          </>
        ) : (
          <div className="course-card-footer">
            <span>
              {course.duration} <span className="muted">· Self-paced</span>
            </span>
            <Link to={`/courses/${course.slug}`} className="text-link">
              {course.price === 0 ? "Free" : `$${course.price}`}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
export function CheckList({ items }) {
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={17} />
          {item}
        </li>
      ))}
    </ul>
  );
}
export function DataTable({ children }) {
  const sections = Children.toArray(children);
  const head = sections.find((section) => section.type === "thead");
  const headerRow = Children.toArray(head?.props.children)[0];
  const labels = Children.toArray(headerRow?.props.children).map((cell) =>
    typeof cell.props.children === "string" ? cell.props.children : "Actions",
  );
  return (
    <table>
      {sections.map((section) =>
        section.type !== "tbody"
          ? section
          : cloneElement(
              section,
              {},
              Children.map(section.props.children, (row) =>
                !isValidElement(row)
                  ? row
                  : cloneElement(
                      row,
                      {},
                      Children.map(row.props.children, (cell, index) =>
                        isValidElement(cell)
                          ? cloneElement(cell, {
                              "data-label": labels[index] || "Actions",
                            })
                          : cell,
                      ),
                    ),
              ),
            ),
      )}
    </table>
  );
}
