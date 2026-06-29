import fs from "node:fs/promises";
import path from "node:path";

export async function saveGuide(slug: string, content: string): Promise<string> {
  const guidesDirectory = path.join(process.cwd(), "content", "guides");
  const outputPath = path.join(guidesDirectory, `${slug}.mdx`);

  await fs.mkdir(guidesDirectory, { recursive: true });
  await fs.writeFile(outputPath, content, "utf8");

  return outputPath;
}
