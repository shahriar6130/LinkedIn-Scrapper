/**
 * Universal result envelope returned by every extractor.
 */
export interface ExtractorResult<T = Record<string, string | string[]>> {
  success: boolean;
  data: T;
  warnings: string[];
  errors: string[];
  /** Execution time in milliseconds */
  timing: number;
}

/**
 * Shared context passed to every extractor.
 * `nameEl` is populated by ProfileExtractor after finding the name element,
 * so subsequent extractors can use it as an anchor.
 */
export interface ScraperContext {
  root: Document;
  nameEl: Element | null;
}

/**
 * Signature every extractor must implement.
 */
export type ExtractorFn<T = Record<string, string | string[]>> = (
  ctx: ScraperContext
) => ExtractorResult<T>;
