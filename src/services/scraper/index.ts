import type { ProfileScrapeResult } from "@/models";
import type { IScraperService } from "../interfaces";
import { MessageType } from "@/messaging";
import { ChromeMessageBus } from "@/messaging";

/**
 * ScraperService delegates to the background service worker,
 * which injects a MAIN-world script to scrape the LinkedIn DOM.
 */
export class ScraperService implements IScraperService {
  private messageBus = new ChromeMessageBus();

  async scrapeProfile(): Promise<ProfileScrapeResult> {
    const result = await this.messageBus.sendMessage<ProfileScrapeResult>(MessageType.SCRAPE_PROFILE);
    return result ?? { error: "No result from scraping" };
  }
}
