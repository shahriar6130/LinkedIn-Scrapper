import type { Profile, ProfileScrapeResult, Alumni, Experience, ExperienceScrapeData } from "@/models";
import type { IProfileService } from "../interfaces";

/**
 * Maps between Profile, ProfileScrapeResult, and Alumni models.
 */
export class ProfileService implements IProfileService {
  /**
   * Convert a raw scrape result into a clean Profile model.
   * Returns null if the result contains an error or has no name.
   */
  toProfile(result: ProfileScrapeResult): Profile | null {
    if (result.error || !result.name) return null;

    const experiences = this.parseExperiences(result.experiences);
    const currentExp = experiences.find((e) => e.current) ?? experiences[0] ?? null;

    return {
      name: result.name,
      headline: result.designation,
      currentExperience: currentExp,
      experiences,
      profileLink: result.profileLink,
      location: result.location,
      education:
        result.educationInstitute
          ? {
              institute: result.educationInstitute,
              degree: result.degree,
              timeline: result.educationTimeline,
            }
          : null,
      profilePicture: result.profilePicture,
      hostedPicture: result.hostedPicture ?? "",
      connectionDegree: result.connectionDegree,
      about: result.about ?? "",
      skills: (result.skills ?? []).map((s) => ({ name: s })),
      industry: result.industry ?? "",
    };
  }

  /**
   * Flatten a Profile into an Alumni record for storage.
   */
  toAlumni(profile: Profile): Alumni {
    return {
      name: profile.name,
      designation: profile.headline,
      companyName: profile.currentExperience?.company ?? "",
      profileLink: profile.profileLink,
      location: profile.location,
      educationInstitute: profile.education?.institute ?? "",
      degree: profile.education?.degree ?? "",
      educationTimeline: profile.education?.timeline ?? "",
      profilePicture: profile.profilePicture,
      hostedPicture: profile.hostedPicture ?? "",
      connectionDegree: profile.connectionDegree,
      about: profile.about ?? "",
      skills: JSON.stringify(profile.skills?.map((s) => s.name) ?? []),
      industry: profile.industry ?? "",
      experiences: JSON.stringify(profile.experiences ?? []),
      addedAt: Date.now(),
    };
  }

  private parseExperiences(json: string | undefined): Experience[] {
    if (!json) return [];
    try {
      const raw: ExperienceScrapeData[] = JSON.parse(json);
      return raw.map((r) => ({
        title: r.title ?? "",
        company: r.company ?? "",
        employmentType: r.employmentType ?? "",
        start: r.start ?? "",
        end: r.end ?? "",
        duration: r.duration ?? "",
        current: r.current ?? false,
        location: r.location ?? "",
      }));
    } catch {
      return [];
    }
  }
}
