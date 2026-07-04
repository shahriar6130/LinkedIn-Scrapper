import type { Experience } from "./experience";
import type { Education } from "./education";
import type { Skill } from "./skill";

export interface Profile {
  name: string;
  headline: string;
  currentExperience: Experience | null;
  experiences: Experience[];
  profileLink: string;
  location: string;
  education: Education | null;
  educations: Education[];
  profilePicture: string;
  hostedPicture: string;
  connectionDegree: string;
  followers: string;
  connections: string;
  languages: string[];
  about: string;
  skills: Skill[];
  industry: string;
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
  hostedPicture?: string;
  connectionDegree: string;
  followers: string;
  connections: string;
  languages: string[];
  about: string;
  skills: string[];
  industry: string;
  experiences: string; // JSON-encoded ExperienceScrapeData[]
  educations: string;  // JSON-encoded EducationScrapeData[]
  error?: string;
}
