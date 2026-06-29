import type OpenAI from "openai";

export type FaqItem = {
  question: string;
  answer: string;
};

export async function generateFaq(
  _client: OpenAI,
  _context: string
): Promise<FaqItem[]> {
  throw new Error("AI FAQ generation is not implemented yet.");
}
