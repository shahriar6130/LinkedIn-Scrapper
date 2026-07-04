import type { IImageUploadProvider } from "./types";

/**
 * Cloudinary image upload provider.
 *
 * Uses unsigned upload via the Cloudinary Upload API.
 * Requires an unsigned upload preset configured in the Cloudinary dashboard.
 */
export class CloudinaryProvider implements IImageUploadProvider {
  readonly name = "cloudinary";

  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  }

  async upload(data: Blob, filename: string): Promise<string> {
    const endpoint = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", data, filename);
    formData.append("upload_preset", this.uploadPreset);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Cloudinary upload failed (${response.status}): ${body.slice(0, 200)}`
      );
    }

    const result = (await response.json()) as { secure_url: string };
    if (!result.secure_url) {
      throw new Error("Cloudinary upload succeeded but no secure_url returned");
    }

    return result.secure_url;
  }
}
