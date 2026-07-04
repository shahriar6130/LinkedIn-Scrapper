/**
 * Abstraction for cloud image upload providers.
 * Each provider implements upload() and returns a public URL.
 */
export interface IImageUploadProvider {
  readonly name: string;
  /** Upload image data and return the public hosted URL. */
  upload(data: Blob, filename: string): Promise<string>;
}

/** Result of the full image pipeline (fetch + validate + upload). */
export interface ImagePipelineResult {
  /** Hosted URL returned by the provider (empty if upload failed). */
  hostedUrl: string;
  /** Original LinkedIn image URL. */
  originalUrl: string;
  /** Provider name that was used, or "none". */
  provider: string;
  /** Non-fatal warnings encountered during the pipeline. */
  warnings: string[];
}
