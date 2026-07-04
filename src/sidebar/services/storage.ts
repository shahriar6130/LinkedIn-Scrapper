import { STORAGE_KEY } from "@/sidebar/lib/constants";
import type { Alumni } from "@/shared/types";

/**
 * Load alumni list from chrome.storage.local.
 * Runs legacy migration on first call if needed.
 */
export async function getAlumni(): Promise<Alumni[]> {
  await migrateLegacyLeads();
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY] as Alumni[] | undefined;
      resolve(stored ?? []);
    });
  });
}

/**
 * Persist the alumni list to chrome.storage.local.
 */
export async function saveAlumni(alumni: Alumni[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: alumni }, () => {
      resolve();
    });
  });
}

/**
 * Migration: if the legacy "leads" key exists,
 * transform entries to Alumni format (add addedAt),
 * save under "alumni_leads", then delete "leads".
 */
async function migrateLegacyLeads(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get("leads", (result) => {
      const legacyLeads = result["leads"] as Array<Record<string, unknown>> | undefined;

      if (!legacyLeads || !Array.isArray(legacyLeads) || legacyLeads.length === 0) {
        resolve();
        return;
      }

      // Transform legacy leads into Alumni format
      const alumni: Alumni[] = legacyLeads.map((lead) => ({
        name: (lead.name as string) ?? "",
        designation: (lead.designation as string) ?? "",
        companyName: (lead.companyName as string) ?? "",
        profileLink: (lead.profileLink as string) ?? "",
        location: (lead.location as string) ?? "",
        educationInstitute: (lead.educationInstitute as string) ?? "",
        degree: (lead.degree as string) ?? "",
        educationTimeline: (lead.educationTimeline as string) ?? "",
        profilePicture: (lead.profilePicture as string) ?? "",
        connectionDegree: (lead.connectionDegree as string) ?? "",
        addedAt: (lead.addedAt as number) ?? Date.now(),
      }));

      // Save under new key
      chrome.storage.local.set({ [STORAGE_KEY]: alumni }, () => {
        // Delete old key
        chrome.storage.local.remove("leads", () => {
          resolve();
        });
      });
    });
  });
}
