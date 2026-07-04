/** A single education entry. */
export interface Education {
  institute: string;
  degree: string;
  field: string;
  timeline: string;
  description: string;
}

/** Flat education shape used for JSON serialization in scraping results. */
export interface EducationScrapeData {
  institute: string;
  degree: string;
  field: string;
  timeline: string;
  description: string;
}
export interface Education {
  institute: string;
  degree: string;
  timeline: string;
}
