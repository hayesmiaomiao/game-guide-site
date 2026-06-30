export type ImageGuideInput = {
  title: string;
  slug: string;
  game: string;
  category: string;
  keyword: string;
  difficulty: string;
};

export type ImageManifestEntry = ImageGuideInput & {
  filename: string;
  imagePath: string;
  prompt: string;
};

export type ImageManifest = {
  version: 1;
  images: ImageManifestEntry[];
};
