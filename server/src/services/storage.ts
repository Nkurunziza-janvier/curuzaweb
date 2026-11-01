import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { AppError } from "../utils/errors.js";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

function detectImageExtension(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a") return ".gif";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a") return ".gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
  return null;
}

export const storageService = {
  async save(file: Express.Multer.File) {
    const extension = detectImageExtension(file.buffer);
    if (!extension) throw new AppError(400, "INVALID_FILE_TYPE", "The uploaded file is not a valid JPEG, PNG, WebP, or GIF image");
    await mkdir(uploadDirectory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const destination = path.join(uploadDirectory, fileName);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(destination, file.buffer);
    return `/uploads/${fileName}`;
  },
  async remove(publicUrl: string) {
    const fileName = path.basename(publicUrl);
    if (!fileName) return;
    await unlink(path.join(uploadDirectory, fileName)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  },
};
