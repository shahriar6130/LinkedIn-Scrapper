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

export interface ScrapeResult extends ProfileData {
  error?: string;
}
