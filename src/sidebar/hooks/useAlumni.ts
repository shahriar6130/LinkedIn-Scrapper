import { useState, useEffect, useCallback } from "react";
import { getAlumni, saveAlumni } from "@/sidebar/services/storage";
import type { Alumni } from "@/shared/types";

export function useAlumni() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    getAlumni().then((stored) => {
      setAlumni(stored);
      setLoaded(true);
    });
  }, []);

  // Persist to storage on change
  useEffect(() => {
    if (loaded) {
      saveAlumni(alumni);
    }
  }, [alumni, loaded]);

  const addAlumni = useCallback(
    (data: Omit<Alumni, "addedAt">): boolean => {
      const exists = alumni.some((a) => a.profileLink === data.profileLink);
      if (exists) return false;
      setAlumni((prev) => [{ ...data, addedAt: Date.now() }, ...prev]);
      return true;
    },
    [alumni]
  );

  const removeAlumni = useCallback((profileLink: string) => {
    setAlumni((prev) => prev.filter((a) => a.profileLink !== profileLink));
  }, []);

  const clearAll = useCallback(() => {
    setAlumni([]);
  }, []);

  const isAdded = useCallback(
    (profileLink: string) => {
      return alumni.some((a) => a.profileLink === profileLink);
    },
    [alumni]
  );

  const searchAlumni = useCallback(
    (query: string) => {
      if (!query.trim()) return alumni;
      const q = query.toLowerCase();
      return alumni.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.companyName.toLowerCase().includes(q) ||
          a.designation.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q)
      );
    },
    [alumni]
  );

  const todayCount = alumni.filter((a) => {
    const today = new Date();
    const added = new Date(a.addedAt);
    return (
      added.getDate() === today.getDate() &&
      added.getMonth() === today.getMonth() &&
      added.getFullYear() === today.getFullYear()
    );
  }).length;

  return {
    alumni,
    loaded,
    addAlumni,
    removeAlumni,
    clearAll,
    isAdded,
    searchAlumni,
    totalCount: alumni.length,
    todayCount,
  };
}
