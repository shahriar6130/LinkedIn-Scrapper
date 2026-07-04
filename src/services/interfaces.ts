import type { Alumni, Profile, ProfileScrapeResult } from "@/models";

export interface ILoggerService {
  info(tag: string, message: string, data?: unknown): void;
  warn(tag: string, message: string, data?: unknown): void;
  error(tag: string, message: string, data?: unknown): void;
}

export interface IStorageService {
  getAlumni(): Promise<Alumni[]>;
  saveAlumni(alumni: Alumni[]): Promise<void>;
}

export interface IExportService {
  exportCSV(alumni: Alumni[]): void;
  exportExcel(alumni: Alumni[]): Promise<void>;
}

export interface IScraperService {
  scrapeProfile(): Promise<ProfileScrapeResult>;
}

export interface IProfileService {
  toProfile(result: ProfileScrapeResult): Profile | null;
  toAlumni(profile: Profile): Alumni;
}

export interface IMessageBus {
  sendMessage<T>(type: string, payload?: unknown): Promise<T>;
}
