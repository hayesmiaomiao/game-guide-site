import type OpenAI from "openai";

export type GuideMetaInput = {
  game: string;
  keyword: string;
  category: string;
  difficulty?: string;
  patch?: string;
};

export type GuideMeta = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  tags: string[];
};

export async function generateMeta(
  _client: OpenAI,
  _input: GuideMetaInput
): Promise<GuideMeta> {
  throw new Error("AI metadata generation is not implemented yet.");
}
