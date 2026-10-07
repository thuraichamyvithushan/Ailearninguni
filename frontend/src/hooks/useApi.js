import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
export function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!url) {
      setLoading(false);
      return;
    }
    api
      .get(url)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, revision]);
  return { data, loading, error, refresh, setData };
}
