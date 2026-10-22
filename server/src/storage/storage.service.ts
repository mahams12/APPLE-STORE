import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { loadConfig } from "../config";
import { logInfo, logWarn } from "../logger";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

function secureName(ext: string) {
  return `${Date.now()}-${randomBytes(12).toString("hex")}.${ext}`;
}

function extFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Minimal AWS SigV4 for S3-compatible PutObject / DeleteObject (server-only). */
async function s3Request(opts: {
  method: "PUT" | "DELETE";
  endpoint: string;
  region: string;
  bucket: string;
  key: string;
  accessKey: string;
  secretKey: string;
  body?: Buffer;
  contentType?: string;
}) {
  const url = new URL(opts.endpoint);
  const host = url.host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${opts.bucket}/${opts.key.split("/").map(encodeURIComponent).join("/")}`;
  const payloadHash = createHash("sha256").update(opts.body || Buffer.alloc(0)).digest("hex");
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (opts.contentType) headers["content-type"] = opts.contentType;
  const signedHeaders = Object.keys(headers)
    .sort()
    .join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");
  const canonicalRequest = [
    opts.method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${opts.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const kDate = createHmac("sha256", `AWS4${opts.secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(opts.region).digest();
  const kService = createHmac("sha256", kRegion).update("s3").digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const target = `${url.origin}${canonicalUri}`;
  const res = await fetch(target, {
    method: opts.method,
    headers,
    body: opts.body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 ${opts.method} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

@Injectable()
export class StorageService {
  private localDir() {
    return path.join(process.cwd(), "../web/public/uploads");
  }

  validate(file?: { mimetype: string; buffer: Buffer; originalname: string }) {
    if (!file) throw new BadRequestException("Choose an image to upload.");
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException("Use a JPEG, PNG, or WebP image.");
    if (!file.buffer?.length) throw new BadRequestException("Empty upload.");
    if (file.buffer.length > MAX_BYTES) throw new BadRequestException("Image must be 4 MB or smaller.");
    return file;
  }

  configured() {
    return !!loadConfig().s3;
  }

  mode(): "s3" | "local" {
    const cfg = loadConfig();
    if (cfg.isProd && !cfg.s3) return "local"; // degraded — health will report
    return cfg.s3 ? "s3" : "local";
  }

  async upload(file: { mimetype: string; buffer: Buffer; originalname: string }) {
    const valid = this.validate(file);
    const ext = extFor(valid.mimetype);
    const name = secureName(ext);
    const cfg = loadConfig();

    if (cfg.s3) {
      const key = `products/${name}`;
      await s3Request({
        method: "PUT",
        endpoint: cfg.s3.endpoint,
        region: cfg.s3.region,
        bucket: cfg.s3.bucket,
        key,
        accessKey: cfg.s3.accessKey,
        secretKey: cfg.s3.secretKey,
        body: valid.buffer,
        contentType: valid.mimetype,
      });
      const url = `${cfg.s3.publicUrl}/${key}`;
      logInfo("storage.upload", { mode: "s3", key });
      return {
        url,
        key,
        srcSet: `${url} 1x`,
        widths: [400, 800, 1200],
      };
    }

    if (cfg.isProd) {
      logWarn("storage.local_in_production", {
        message: "S3 not configured; writing to local uploads (not multi-instance safe)",
      });
    }

    const dir = this.localDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, name), valid.buffer);
    const url = `/uploads/${name}`;
    logInfo("storage.upload", { mode: "local", name });
    return {
      url,
      key: name,
      srcSet: `${url} 1x`,
      widths: [400, 800, 1200],
    };
  }

  async delete(urlOrKey: string) {
    const cfg = loadConfig();
    if (cfg.s3) {
      const key = urlOrKey.includes("products/")
        ? urlOrKey.slice(urlOrKey.indexOf("products/"))
        : `products/${urlOrKey.replace(/^\/uploads\//, "")}`;
      try {
        await s3Request({
          method: "DELETE",
          endpoint: cfg.s3.endpoint,
          region: cfg.s3.region,
          bucket: cfg.s3.bucket,
          key,
          accessKey: cfg.s3.accessKey,
          secretKey: cfg.s3.secretKey,
        });
        logInfo("storage.delete", { mode: "s3", key });
      } catch (error) {
        logWarn("storage.delete_failed", { message: error instanceof Error ? error.message : "delete failed" });
      }
      return;
    }
    const name = urlOrKey.replace(/^\/uploads\//, "");
    const file = path.join(this.localDir(), name);
    if (existsSync(file)) unlinkSync(file);
  }

  async replace(oldUrl: string | null | undefined, file: { mimetype: string; buffer: Buffer; originalname: string }) {
    const uploaded = await this.upload(file);
    if (oldUrl) await this.delete(oldUrl);
    return uploaded;
  }

  async health(): Promise<{ ok: boolean; mode: string; detail?: string }> {
    const cfg = loadConfig();
    if (cfg.s3) return { ok: true, mode: "s3" };
    if (cfg.isProd) return { ok: false, mode: "local", detail: "S3 credentials not configured" };
    return { ok: true, mode: "local" };
  }
}
