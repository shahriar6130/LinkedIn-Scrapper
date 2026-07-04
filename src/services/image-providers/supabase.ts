import type { IImageUploadProvider } from "./types";

/**
 * Supabase Storage image upload provider.
 *
 * Uses the Supabase REST Storage API to upload objects
 * and returns the public URL.
 */
export class SupabaseProvider implements IImageUploadProvider {
  readonly name = "supabase";

  private url: string;
  private anonKey: string;
  private bucket: string;

  constructor() {
    this.url = import.meta.env.VITE_SUPABASE_URL;
    this.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.bucket = import.meta.env.VITE_SUPABASE_BUCKET;
  }

  async upload(data: Blob, filename: string): Promise<string> {
    const objectPath = `${this.bucket}/${filename}`;
    const endpoint = `${this.url}/storage/v1/object/${objectPath}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.anonKey}`,
        "Content-Type": data.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: data,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Supabase upload failed (${response.status}): ${body.slice(0, 200)}`
      );
    }

    return `${this.url}/storage/v1/object/public/${objectPath}`;
  }
}
