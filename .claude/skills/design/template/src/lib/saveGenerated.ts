import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Extension for the bytes we actually received.
 *
 * Higgsfield serves WebP for some models even when the URL looks like a PNG,
 * and writing those bytes to a .png makes Next serve them as image/png. Sniff
 * the magic bytes so the file, its extension and its served type agree.
 */
export function extensionFor(buf: Buffer, contentType?: string | null): string {
  if (buf.length >= 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
    if (buf.toString("ascii", 0, 6) === "GIF89a" || buf.toString("ascii", 0, 6) === "GIF87a") return "gif";
  }
  const type = (contentType || "").toLowerCase();
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("gif")) return "gif";
  return "png";
}

export async function saveGeneratedImage(remoteUrl: string): Promise<string> {
  const resp = await fetch(remoteUrl);
  if (!resp.ok) throw new Error(`Could not fetch generated image (${resp.status}).`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const dir = join(process.cwd(), "public", "images", "generated");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${extensionFor(buf, resp.headers.get("content-type"))}`;
  await writeFile(join(dir, name), buf);
  return `/images/generated/${name}`;
}
