import { useState, useEffect, useCallback } from "react";
import { useServices } from "@/core/container";
import type { ProfileScrapeResult } from "@/models";

export function useProfile() {
  const { scraper, logger } = useServices();
  const [profile, setProfile] = useState<ProfileScrapeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrapeProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    setProfile(null);

    scraper
      .scrapeProfile()
      .then((response) => {
        setLoading(false);
        if (response?.error) {
          logger.error("Profile", "Scrape error:", response.error);
          setError(response.error);
          return;
        }
        if (response?.name) {
          setProfile(response);
        } else {
          setError("Could not read profile data. Make sure you're on a LinkedIn profile page.");
        }
      })
      .catch((err) => {
        setLoading(false);
        logger.error("Profile", "Scrape failed:", err);
        setError("Could not connect to page. Try refreshing the tab.");
      });
  }, [scraper, logger]);

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
