import { Brand, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { ProjectReviews } from "./Assessment";
export default function Instructor() {
  const { logout } = useAuth();
  return (
    <div className="container">
      <header
        className="row"
        style={{ padding: "25px 0", borderBottom: "1px solid var(--border)" }}
      >
        <Brand />
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </header>
      <ProjectReviews endpoint="/instructor/projects" />
    </div>
  );
}
