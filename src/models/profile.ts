import type { Experience } from "./experience";
import type { Education } from "./education";

export interface Profile {
  name: string;
  headline: string;
  currentExperience: Experience | null;
  profileLink: string;
  location: string;
  education: Education | null;
  profilePicture: string;
  connectionDegree: string;
}

/** Raw result from DOM scraping (flat shape, before mapping to Profile) */
export interface ProfileScrapeResult {
  name: string;
  designation: string;
  companyName: string;
  profileLink: string;
  location: string;
  educationInstitute: string;
  degree: string;
  educationTimeline: string;
  profilePicture: string;
  connectionDegree: string;
  error?: string;
}
