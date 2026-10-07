import { useEffect, useState } from "react";
import { api } from "../../services/api";
export default function LessonMedia({ lesson }) {
  const [media, setMedia] = useState("");
  const [error, setError] = useState("");
  const url = lesson.resources?.[0]?.url;
  useEffect(() => {
    let active = true;
    let objectUrl;
    setMedia("");
    setError("");
    if (!url) return;
    async function load() {
      try {
        if (url.startsWith("/api/uploads/")) {
          const { data } = await api.get(url, { responseType: "blob" });
          objectUrl = URL.createObjectURL(data);
          if (active) setMedia(objectUrl);
        } else if (active) setMedia(url);
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  if (!url)
    return (
      <div className="notice">
        Your instructor has not added a file to this lesson yet.
      </div>
    );
  if (error) return <div className="form-error">{error}</div>;
  if (!media) return <div className="notice">Loading lesson resource…</div>;
  return lesson.type === "image" ? (
    <img
      style={{
        width: "100%",
        maxHeight: 500,
        objectFit: "contain",
        borderRadius: 10,
      }}
      src={media}
      alt={lesson.description || lesson.title}
    />
  ) : (
    <iframe
      style={{
        width: "100%",
        height: 520,
        border: "1px solid var(--border)",
        borderRadius: 10,
      }}
      title={lesson.title}
      src={media}
    />
  );
}
