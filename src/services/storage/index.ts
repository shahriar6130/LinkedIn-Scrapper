import { STORAGE_KEY } from "@/core/constants";
import type { Alumni } from "@/models";
import type { IStorageService } from "../interfaces";

export class StorageService implements IStorageService {
  /**
   * Load alumni list from chrome.storage.local.
   * Runs legacy migration on first call if needed.
   */
  async getAlumni(): Promise<Alumni[]> {
    await this.migrateLegacyLeads();
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
  async saveAlumni(alumni: Alumni[]): Promise<void> {
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
  private async migrateLegacyLeads(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get("leads", (result) => {
        const legacyLeads = result["leads"] as Array<Record<string, unknown>> | undefined;

        if (!legacyLeads || !Array.isArray(legacyLeads) || legacyLeads.length === 0) {
          resolve();
          return;
        }

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
          hostedPicture: (lead.hostedPicture as string) ?? "",
          connectionDegree: (lead.connectionDegree as string) ?? "",
          about: (lead.about as string) ?? "",
          skills: (lead.skills as string) ?? "",
          industry: (lead.industry as string) ?? "",
          experiences: (lead.experiences as string) ?? "[]",
          addedAt: (lead.addedAt as number) ?? Date.now(),
        }));

        chrome.storage.local.set({ [STORAGE_KEY]: alumni }, () => {
          chrome.storage.local.remove("leads", () => {
            resolve();
          });
        });
      });
    });
  }
}
