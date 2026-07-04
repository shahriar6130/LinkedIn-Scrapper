import type { ILoggerService } from "../interfaces";

export class LoggerService implements ILoggerService {
  info(tag: string, message: string, data?: unknown): void {
    console.log(`[${tag}] ${message}`, data ?? "");
  }

  warn(tag: string, message: string, data?: unknown): void {
    console.warn(`[${tag}] ${message}`, data ?? "");
  }

  error(tag: string, message: string, data?: unknown): void {
    console.error(`[${tag}] ${message}`, data ?? "");
  }
}
