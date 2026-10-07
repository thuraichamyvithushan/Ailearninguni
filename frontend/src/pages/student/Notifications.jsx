import { useEffect } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Page,
  PageHeading,
} from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { api } from "../../services/api";
export default function Notifications() {
  const resource = useApi("/notifications");
  useEffect(() => {
    api.post("/notifications/read").catch(() => {});
  }, []);
  return (
    <Page>
      <PageHeading
        eyebrow="YOUR LATEST UPDATES"
        title="A little progress worth noticing."
        description="Lesson milestones, project feedback, and new certificates in one place."
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <div className="notification-list">
          {resource.data.map((n) => (
            <article key={n.id} className="card">
              <div className="row">
                <h3 style={{ fontSize: 15 }}>{n.title}</h3>
                <Badge tone={n.type === "project" ? "violet" : "green"}>
                  {n.type}
                </Badge>
              </div>
              <p>{n.message}</p>
              <span className="muted small-text">
                {new Date(n.date).toLocaleString("en-GB")}
              </span>
            </article>
          ))}
          {!resource.data.length && (
            <Empty
              icon={Bell}
              title="Your next update is ahead"
              description="Complete a lesson or submit a project to see your learning milestones here."
            />
          )}
        </div>
      )}
    </Page>
  );
}
