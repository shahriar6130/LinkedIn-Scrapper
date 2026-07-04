import React, { createContext, useContext, useMemo } from "react";
import type {
  ILoggerService,
  IStorageService,
  IExportService,
  IScraperService,
  IProfileService,
} from "@/services/interfaces";
import { LoggerService } from "@/services/logger";
import { StorageService } from "@/services/storage";
import { ExportService } from "@/services/export";
import { ScraperService } from "@/services/scraper";
import { ProfileService } from "@/services/profile";

export interface ServiceContainer {
  logger: ILoggerService;
  storage: IStorageService;
  export: IExportService;
  scraper: IScraperService;
  profile: IProfileService;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

/**
 * Build the default service container with production implementations.
 */
function createDefaultContainer(): ServiceContainer {
  return {
    logger: new LoggerService(),
    storage: new StorageService(),
    export: new ExportService(),
    scraper: new ScraperService(),
    profile: new ProfileService(),
  };
}

export function ContainerProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo(() => createDefaultContainer(), []);
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

/**
 * Access all registered services. Must be used inside <ContainerProvider>.
 */
export function useServices(): ServiceContainer {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error("useServices must be used within a <ContainerProvider>");
  }
  return ctx;
}
