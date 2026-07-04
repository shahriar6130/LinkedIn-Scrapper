import React, { createContext, useContext, useMemo } from "react";
import type {
  ILoggerService,
  IStorageService,
  IExportService,
  IScraperService,
  IProfileService,
  IImagePipelineService,
} from "@/services/interfaces";
import { LoggerService } from "@/services/logger";
import { StorageService } from "@/services/storage";
import { ExportService } from "@/services/export";
import { ScraperService } from "@/services/scraper";
import { ProfileService } from "@/services/profile";
import { createImageProviders } from "@/services/image-providers";
import { ImagePipelineService } from "@/services/image-pipeline";

export interface ServiceContainer {
  logger: ILoggerService;
  storage: IStorageService;
  export: IExportService;
  scraper: IScraperService;
  profile: IProfileService;
  imagePipeline: IImagePipelineService | null;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

/**
 * Build the default service container with production implementations.
 */
function createDefaultContainer(): ServiceContainer {
  const providers = createImageProviders();
  return {
    logger: new LoggerService(),
    storage: new StorageService(),
    export: new ExportService(),
    scraper: new ScraperService(),
    profile: new ProfileService(),
    imagePipeline: providers.length > 0 ? new ImagePipelineService(providers) : null,
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
