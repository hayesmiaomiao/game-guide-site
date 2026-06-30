import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const imageWidth = 1200;
export const imageHeight = 675;
export const imageQuality = 82;

export async function imageExists(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

export async function saveFeaturedImage(input: Buffer, outputPath: string) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;

  try {
    await sharp(input)
      .rotate()
      .resize(imageWidth, imageHeight, {
        fit: "cover",
        position: "attention"
      })
      .webp({ quality: imageQuality })
      .toFile(temporaryPath);
    await fs.rename(temporaryPath, outputPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function readImageMetadata(filePath: string) {
  const metadata = await sharp(filePath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format
  };
}
