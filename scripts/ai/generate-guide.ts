import "dotenv/config";
import OpenAI from "openai";

export type GuideCliOptions = {
  game: string;
  keyword: string;
  category: string;
  difficulty?: string;
  patch?: string;
};

function parseArguments(argv: string[]): GuideCliOptions {
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values[key] = value;
    index += 1;
  }

  const missing = ["game", "keyword", "category"].filter((key) => !values[key]);
  if (missing.length) {
    throw new Error(`Missing required arguments: ${missing.map((key) => `--${key}`).join(", ")}`);
  }

  return {
    game: values.game,
    keyword: values.keyword,
    category: values.category,
    difficulty: values.difficulty,
    patch: values.patch
  };
}

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));

    console.log(`Game: ${options.game}`);
    console.log(`Keyword: ${options.keyword}`);
    console.log(`Category: ${options.category}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Guide CLI failed: ${message}`);
    process.exitCode = 1;
  }
}

main();
