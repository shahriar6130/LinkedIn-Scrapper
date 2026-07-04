/** A single work experience entry. */
export interface Experience {
  title: string;
  company: string;
  employmentType: string;
  start: string;
  end: string;
  duration: string;
  current: boolean;
  location: string;
}

/** Flat experience shape used for JSON serialization in scraping results. */
export interface ExperienceScrapeData {
  title: string;
  company: string;
  employmentType: string;
  start: string;
  end: string;
  duration: string;
  current: boolean;
  location: string;
}
export interface Experience {
  title: string;
  company: string;
}
