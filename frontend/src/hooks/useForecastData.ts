import { useEffect, useState } from "react";
import { getAnalysis } from "../services/api";
import type { Analysis, Filters } from "../types";
export function useForecastData(filters: Filters, revision: number) {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    getAnalysis(filters, controller.signal)
      .then(setData)
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, revision]);
  return { data, loading, error };
}
