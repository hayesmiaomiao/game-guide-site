import OpenAI from "openai";

const defaultModel = "gpt-image-2";

function formatOpenAIError(error: unknown) {
  if (!(error instanceof Error)) return String(error);

  const details = error as Error & {
    status?: number;
    code?: string;
    type?: string;
  };
  return [
    `${details.name}: ${details.message}`,
    details.status ? `status=${details.status}` : "",
    details.code ? `code=${details.code}` : "",
    details.type ? `type=${details.type}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

async function downloadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function generateOpenAIImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to an ignored local .env file before running image:generate."
    );
  }

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || defaultModel;
  const client = new OpenAI({
    apiKey,
    timeout: 180_000,
    maxRetries: 2
  });

  try {
    const result = await client.images.generate({
      model: model as "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium"
    });
    const image = result.data?.[0];

    if (image?.b64_json) {
      return Buffer.from(image.b64_json, "base64");
    }
    if (image?.url) {
      return downloadImage(image.url);
    }

    throw new Error("OpenAI returned no image data.");
  } catch (error) {
    throw new Error(`OpenAI image generation failed. ${formatOpenAIError(error)}`);
  }
}
