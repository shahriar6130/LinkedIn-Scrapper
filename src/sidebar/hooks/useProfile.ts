import { useState, useEffect, useCallback } from "react";
import type { ProfileData } from "@/shared/types";

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrapeProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    setProfile(null);

    chrome.runtime.sendMessage({ type: "SCRAPE_PROFILE" }, (response) => {
      setLoading(false);
      if (chrome.runtime.lastError) {
        setError("Could not connect to page. Try refreshing the tab.");
        return;
      }
      if (response?.error) {
        setError(response.error);
        return;
      }
      if (response?.name) {
        setProfile(response as ProfileData);
      } else {
        setError("Could not read profile data. Make sure you're on a LinkedIn profile page.");
      }
    });
  }, []);

  // Auto-scrape on mount
  useEffect(() => {
    scrapeProfile();
  }, [scrapeProfile]);

  // Re-scrape when LinkedIn navigates to a new profile (SPA navigation)
  useEffect(() => {
    const handler = () => {
      scrapeProfile();
    };
    window.addEventListener("alumni-sidebar-url-change", handler);
    return () => window.removeEventListener("alumni-sidebar-url-change", handler);
  }, [scrapeProfile]);

  return { profile, loading, error, refetch: scrapeProfile };
}
