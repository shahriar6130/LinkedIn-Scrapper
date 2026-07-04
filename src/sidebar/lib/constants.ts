export const SIDEBAR_WIDTH = 380;
export const SIDEBAR_COLLAPSED_WIDTH = 52;
export const STORAGE_KEY = "alumni_leads";

export interface Alumni {
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
  addedAt: number;
}

export interface ProfileData {
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
}
