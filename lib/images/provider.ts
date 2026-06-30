import { generateOpenAIImage } from "./openai";

export const imageProviderNames = [
  "openai",
  "flux",
  "ideogram",
  "gemini",
  "stable-diffusion"
] as const;

export type ImageProviderName = (typeof imageProviderNames)[number];

export type ImageProvider = {
  name: ImageProviderName;
  generate(prompt: string): Promise<Buffer>;
};

function isImageProviderName(value: string): value is ImageProviderName {
  return imageProviderNames.includes(value as ImageProviderName);
}

export function getImageProvider(
  requestedProvider = process.env.IMAGE_PROVIDER || "openai"
): ImageProvider {
  const name = requestedProvider.trim().toLowerCase();

  if (!isImageProviderName(name)) {
    throw new Error(
      `Unsupported IMAGE_PROVIDER "${requestedProvider}". Choose one of: ${imageProviderNames.join(", ")}.`
    );
  }

  if (name === "openai") {
    return {
      name,
      generate: generateOpenAIImage
    };
  }

  throw new Error(
    `IMAGE_PROVIDER "${name}" is reserved for a future provider and is not implemented yet.`
  );
}
