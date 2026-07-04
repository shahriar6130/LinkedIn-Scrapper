import type { IImageUploadProvider } from "./types";

/**
 * Cloudflare R2 image upload provider.
 *
 * Uses the S3-compatible API with AWS Signature V4 presigned URLs.
 * All cryptographic signing is done via the Web Crypto API (no SDK required).
 */
export class CloudflareR2Provider implements IImageUploadProvider {
  readonly name = "cloudflare-r2";

  private accountId: string;
  private bucket: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private publicUrl: string;

  constructor() {
    this.accountId = import.meta.env.VITE_CF_R2_ACCOUNT_ID;
    this.bucket = import.meta.env.VITE_CF_R2_BUCKET;
    this.accessKeyId = import.meta.env.VITE_CF_R2_ACCESS_KEY_ID;
    this.secretAccessKey = import.meta.env.VITE_CF_R2_SECRET_ACCESS_KEY;
    this.publicUrl = import.meta.env.VITE_CF_R2_PUBLIC_URL;
  }

  async upload(data: Blob, filename: string): Promise<string> {
    const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;
    const objectKey = encodeURIComponent(filename);
    const region = "auto";
    const service = "s3";
    const now = new Date();

    const dateStamp = formatDate(now);
    const amzDate = formatAmzDate(now);
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    // Canonical headers
    const contentType = data.type || "application/octet-stream";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${this.accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join("\n");

    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    // Canonical request
    const canonicalRequest = [
      "PUT",
      `/${this.bucket}/${objectKey}`,
      "",
      canonicalHeaders + "\n",
      signedHeaders,
      payloadHash,
    ].join("\n");

    // String to sign
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // Signing key
    const kDate = await hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, "aws4_request");

    // Signature
    const signature = await hmacHex(kSigning, stringToSign);

    // Presigned authorization header
    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", ");

    // PUT the object
    const url = `${endpoint}/${this.bucket}/${objectKey}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        Authorization: authorization,
      },
      body: data,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`R2 upload failed (${response.status}): ${body.slice(0, 200)}`);
    }

    return `${this.publicUrl}/${objectKey}`;
  }
}

// ── AWS Sig V4 helpers ─────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatAmzDate(d: Date): string {
  return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message)
  );
  return toHex(buf);
}

async function hmac(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const sig = await hmac(key, data);
  return toHex(sig);
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
