import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

export async function generateCompletion(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in the project .env file.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: 120000
  });

  try {
    console.log("Calling OpenAI...");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `${prompt}\n\nWrite 800-1200 words. Return pure Markdown only, without code fences or commentary outside the article.`,
      temperature: 0.3,
      max_output_tokens: 4000
    });

    console.log("OpenAI response received.");

    const output = response.output_text?.trim();
    if (!output) {
      throw new Error("OpenAI returned an empty response.");
    }

    return output;
  } catch (error) {
    const details = error as {
      name?: string;
      message?: string;
      status?: number;
      code?: string;
    };

    console.error("error.name:", details.name);
    console.error("error.message:", details.message);
    console.error("error.status:", details.status);
    console.error("error.code:", details.code);
    throw error;
  }
}
