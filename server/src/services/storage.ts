import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Express } from "express";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

export const storageService = {
  async save(file: Express.Multer.File) {
    await mkdir(uploadDirectory, { recursive: true });
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
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
