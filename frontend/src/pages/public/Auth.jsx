import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Badge, Button, Field, useToast } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { resetPassword } from "../../services/auth";
import { authMode } from "../../services/firebase";
export default function AuthPage({ register = false }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  async function submit(e, demo) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (reset) {
        await resetPassword(email);
        toast("Password reset email sent. Check your inbox.");
        setReset(false);
        return;
      }
      const user = register
        ? await auth.register(name, email, password)
        : await auth.login(
            demo ? `${demo}@aiatlas.demo` : email,
            demo ? "AtlasDemo2026!" : password,
          );
      const target =
        user.role === "student"
          ? user.onboardingCompleted
            ? "/student/dashboard"
            : "/student/onboarding"
          : user.role === "instructor"
            ? "/instructor"
            : "/admin";
      navigate(register ? target : location.state?.from || target, {
        replace: true,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-intro">
        <div className="eyebrow">EVERY JOURNEY STARTS WITH CURIOSITY</div>
        <h1>
          Your ambition.
          <br />A new set of tools.
          <br />
          <span className="gradient-text">Endless possibilities.</span>
        </h1>
        <p>
          Practical AI skills. A path built around you.
          <br />
          Let’s see what you can do.
        </p>
        <div className="hero-proof">
          <span>✦</span>
          <strong>Learn with purpose. Build with confidence.</strong>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="eyebrow">
            {register ? "YOUR NEXT CHAPTER" : "GOOD TO HAVE YOU BACK"}
          </div>
          <h1>
            {reset
              ? "Reset your password"
              : register
                ? "Start your AI journey."
                : "Welcome back."}
          </h1>
          <p>
            {reset
              ? "We’ll send a link to your email address."
              : register
                ? "Create an account and find a path that fits you."
                : "Pick up where you left off. There’s more to discover."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <Field label="Full name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  maxLength={200}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
            {!reset && (
              <Field
                label="Password"
                hint={
                  register
                    ? "At least 8 characters. Choose a strong, unique password."
                    : undefined
                }
              >
                <div style={{ position: "relative" }}>
                  <input
                    style={{ paddingRight: 45 }}
                    required
                    type={show ? "text" : "password"}
                    minLength={register ? 8 : 6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    style={{ position: "absolute", right: 6, top: 5 }}
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            )}
            {!register && authMode === "firebase" && (
              <button
                type="button"
                className="text-link"
                style={{ marginBottom: 15 }}
                onClick={() => setReset(!reset)}
              >
                {reset ? "Back to sign in" : "Forgot your password?"}
              </button>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button busy={busy} type="submit" className="full">
              {reset
                ? "Send reset link"
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <div className="auth-footnote">
            {register
              ? "Already part of the journey?"
              : "New to Ai Learning Uni?"}{" "}
            <Link className="text-link" to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </div>
          {authMode === "demo" && !register && (
            <div className="demo-box">
              <Badge tone="amber">Local demonstration</Badge>
              <p>
                Explore the working portals with sample accounts. Demo data is
                saved on this server.
              </p>
              <div className="row">
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={() => submit(null, "student")}
                >
                  Student demo
                </Button>
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={() => submit(null, "admin")}
                >
                  Admin demo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
