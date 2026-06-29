import type { FaqItem } from "./generate-faq";
import type { GuideMeta } from "./generate-meta";

export type GeneratedGuide = {
  meta: GuideMeta;
  faq: FaqItem[];
  body: string;
};

export function validateGeneratedGuide(_guide: GeneratedGuide): void {
  throw new Error("Generated guide schema validation is not implemented yet.");
}
