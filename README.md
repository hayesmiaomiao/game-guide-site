# GameVault Guides

A dark, mobile-first English game guide site built with Next.js, TypeScript, Tailwind CSS, and MDX content files.

## Features

- Homepage with hero, popular games, latest guides, categories, search entry, and ad placeholders
- Routes for `/`, `/games`, `/games/[slug]`, `/guides`, `/guides/[slug]`, `/categories/[slug]`, `/tags/[slug]`, `/about`, `/contact`
- MDX article content in `content/guides`
- Frontmatter support for title, description, game, category, tags, date, updated, cover image, difficulty, reading time, and FAQ
- Automatic metadata, canonical URLs, sitemap, robots, Article Schema, Breadcrumb Schema, and FAQ Schema
- Basic client-side guide search
- Custom 404 page

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment example:

```bash
cp .env.example .env.local
```

Set your production domain:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_NAME=GameVault Guides
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Add a Guide

Create a new `.mdx` file under `content/guides`. The filename becomes the guide slug.

```mdx
---
title: "Example Guide Title"
description: "Short SEO description for the guide."
game: "Example Game"
category: "beginner guide"
tags:
  - starter
  - builds
date: "2026-06-29"
updated: "2026-06-29"
coverImage: "https://example.com/image.jpg"
coverAlt: "Descriptive image alt text"
difficulty: "Beginner"
readingTime: "6 min read"
faq:
  - question: "Example question?"
    answer: "Example answer."
---

## Your Guide

Write the guide content here.
```

Supported guide categories are beginner guide, walkthrough, tier list, build guide, map guide, and quest guide.

## SEO Notes

Each guide automatically generates:

- HTML title and meta description
- Canonical URL
- Open Graph metadata
- Article Schema
- Breadcrumb Schema
- FAQ Schema when `faq` is present

The sitemap is available at `/sitemap.xml`, and robots rules are available at `/robots.txt`.

## Production Deploy

For Vercel:

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SITE_NAME` in project environment variables.
4. Deploy.

For any Node host:

```bash
npm run build
npm run start
```
