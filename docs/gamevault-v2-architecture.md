# GameVault Guides V2 Architecture

## 1. Project Goal

GameVault Guides is an AI-assisted game guide content platform built with Next.js, TypeScript, Tailwind CSS, and MDX.

The platform is designed to publish English game guide content at scale, including beginner guides, walkthroughs, tier lists, build guides, map guides, quest guides, boss guides, and patch-aware strategy pages. Production uses the standard Next.js deployment on Vercel, with content routes statically generated at build time through the Vercel Next.js Builder.

Primary goals:

- Publish search-friendly game guide pages with clean internal linking.
- Use structured content models for games, guides, authors, categories, and tags.
- Keep guides, games, categories, tags, and the dashboard statically generated during production builds.
- Keep content separate from page templates and reusable UI components.
- Make future AI content generation predictable, validated, and easy to review.

## 2. Information Architecture

Primary routes:

```text
/
/games
/games/[slug]
/guides
/guides/[slug]
/categories/[slug]
/tags/[slug]
/authors/[slug]
/search
/about
/contact
```

Route purpose:

- `/`: Portal homepage linking to popular games, latest guides, categories, search entry points, and ads.
- `/games`: Index of all supported games.
- `/games/[slug]`: SEO landing page for one game, aggregating its guides by category and recency.
- `/guides`: Index and search surface for all guides.
- `/guides/[slug]`: Full guide article page rendered from MDX.
- `/categories/[slug]`: Category archive page, such as beginner guides or tier lists.
- `/tags/[slug]`: Tag archive page, such as early game, farming, or team building.
- `/authors/[slug]`: Author profile and archive page. Planned route; content model already supports authors.
- `/search`: Dedicated search page. Planned route; existing guide search can be promoted here.
- `/about`: Site information and editorial positioning.
- `/contact`: Contact, corrections, partnerships, and advertising inquiries.

## 3. URL Rules

General slug rules:

- Use lowercase ASCII slugs.
- Use hyphens between words.
- Avoid dates in evergreen guide URLs unless the date is part of the official game or event name.
- Do not change published slugs unless a redirect strategy exists.
- Slugs should be stable, descriptive, and human-readable.

Game URL rules:

```text
/games/[game-slug]
```

Examples:

```text
/games/elden-ring
/games/honkai-star-rail
/games/the-legend-of-zelda-tears-of-the-kingdom
```

Guide URL rules:

```text
/guides/[guide-slug]
```

Examples:

```text
/guides/elden-ring-beginner-guide
/guides/honkai-star-rail-tier-list
/guides/zelda-tears-depths-map-guide
```

Category URL rules:

```text
/categories/[category-slug]
```

Preferred category slugs:

```text
beginner-guide
walkthrough
tier-list
build-guide
boss-guide
map-guide
quest-guide
```

Tag URL rules:

```text
/tags/[tag-slug]
```

Tags should be narrower than categories. Examples:

```text
early-game
team-building
exploration
farming
boss-prep
```

Author URL rules:

```text
/authors/[author-slug]
```

Examples:

```text
/authors/hayes
```

## 4. Content Model

All content should be read from the `content/` directory and normalized through `lib/content.ts`. Page templates should not hardcode content that belongs in content files.

### Game

Stored in:

```text
content/games/[slug].json
```

Fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name for the game. |
| `slug` | string | Yes | Stable URL slug. Should match filename. |
| `description` | string | Yes | Game hub intro and SEO support text. |
| `platforms` | string[] | Yes | Platforms shown on game detail pages. |
| `genre` | string | Yes | Genre shown in the game hero. |
| `guideCount` | number | Derived | Number of guides attached to this game. |
| `coverImage` | string | Derived | Primary image from latest or featured guide. |
| `coverAlt` | string | Derived | Accessible alt text for game card image. |
| `latestUpdated` | string | Derived | Most recent `updatedDate` among guides. |
| `categories` | string[] | Derived | Categories represented by this game's guides. |

### Guide

Stored in:

```text
content/guides/[slug].mdx
```

Required frontmatter standard:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `title` | string | Yes | Human-readable article title. |
| `slug` | string | Yes | Stable guide URL slug. Should match filename. |
| `game` | string | Yes | Game slug. Links guide to `content/games`. |
| `category` | string | Yes | Category slug. Links guide to `content/categories`. |
| `difficulty` | string | Yes | Reader difficulty, such as Beginner, Intermediate, Advanced. |
| `author` | string | Yes | Author slug. Links to `content/authors`. |
| `reviewer` | string | Yes | Reviewer slug. Can match author when needed. |
| `publishDate` | string | Yes | ISO-style publish date, `YYYY-MM-DD`. |
| `updatedDate` | string | Yes | ISO-style update date, `YYYY-MM-DD`. |
| `heroImage` | string | Yes | Hero image URL or static asset path. |
| `heroAlt` | string | Yes | Descriptive image alt text. |
| `excerpt` | string | Yes | Short article summary for cards and intros. |
| `platform` | string | Yes | Platform text for guide metadata. |
| `patch` | string | Yes | Patch, version, season, or editorial freshness note. |
| `readingTime` | string | Yes | Estimated reading time. |
| `tags` | string[] | Yes | Tag names or tag-like labels. |
| `featured` | boolean | Yes | Whether the guide can be promoted. |
| `related` | string[] | Yes | Explicit related guide slugs. Empty array allowed. |
| `faq` | object[] | Yes | FAQ items with `question` and `answer`. Empty array allowed. |
| `seoTitle` | string | Yes | Exact SEO title for the guide. |
| `metaDescription` | string | Yes | Exact meta description for the guide. |

Derived guide fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `content` | string | MDX article body. |
| `headings` | object[] | Generated table of contents from `##` and `###`. |
| `gameName` | string | Display name from game data. |
| `categoryName` | string | Display name from category data. |
| `authorData` | Author | Resolved author object. |
| `reviewerData` | Author | Resolved reviewer object. |

### Author

Stored in:

```text
content/authors/[slug].json
```

Fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name. |
| `role` | string | Yes | Editorial role or specialty. |
| `bio` | string | Yes | Short author biography. |
| `avatar` | string | Yes | Static avatar path or image URL. |
| `expertise` | string[] | Yes | Areas of game guide expertise. |
| `socialLinks` | object | Yes | Optional public links. Empty object allowed. |

### Category

Stored in:

```text
content/categories/[slug].json
```

Fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name. |
| `slug` | string | Yes | Category URL slug. Should match filename. |
| `description` | string | Yes | Archive intro and SEO support text. |

### Tag

Stored in:

```text
content/tags/[slug].json
```

Fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name. |
| `slug` | string | Yes | Tag URL slug. Should match filename. |
| `description` | string | Yes | Archive intro and SEO support text. |

## 5. SEO Architecture

SEO should be generated from normalized content data. Pages should not duplicate SEO content manually when the content engine already provides the source fields.

### Homepage

- Title template: `GameVault Guides`
- Meta description: Site-wide value proposition for English game guides.
- Canonical: `/`
- Open Graph: website metadata with site name and description.
- Breadcrumb: Not required.
- JSON-LD: Optional `WebSite` schema when search route is ready.

### Games Index

- Title template: `Games | GameVault Guides`
- Meta description: Browse supported games with walkthroughs, builds, maps, quests, and beginner guides.
- Canonical: `/games`
- Open Graph: standard collection metadata.
- Breadcrumb: `Home > Games`
- JSON-LD: `CollectionPage` optional.

### Game Detail

- Title template: `{Game Name} Guides, Builds, Maps & Walkthroughs | GameVault Guides`
- Meta description: `Browse practical {Game Name} guides, builds, maps, walkthroughs, boss tips, and beginner help updated for players.`
- Canonical: `/games/[slug]`
- Open Graph: game title, description, and guide image.
- Breadcrumb: `Home > Games > {Game Name}`
- JSON-LD:
  - `BreadcrumbList`
  - `CollectionPage`

### Guides Index

- Title template: `Guides | GameVault Guides`
- Meta description: Search English game guides by game, category, tag, build, map, quest, walkthrough, or tier list.
- Canonical: `/guides`
- Open Graph: guide index metadata.
- Breadcrumb: `Home > Guides`
- JSON-LD: `CollectionPage` optional.

### Guide Detail

- Title template: guide `seoTitle`
- Meta description: guide `metaDescription`
- Canonical: `/guides/[slug]`
- Open Graph:
  - `og:type`: `article`
  - title: guide `seoTitle`
  - description: guide `metaDescription`
  - image: guide `heroImage`
  - published time: `publishDate`
  - modified time: `updatedDate`
- Breadcrumb: `Home > Guides > {Game Name} > {Guide Title}`
- JSON-LD:
  - `Article`
  - `BreadcrumbList`
  - `FAQPage` when `faq` exists

### Category Detail

- Title template: `{Category Name} Guides | GameVault Guides`
- Meta description: Category-specific archive description.
- Canonical: `/categories/[slug]`
- Open Graph: category archive metadata.
- Breadcrumb: `Home > Categories > {Category Name}`
- JSON-LD: `CollectionPage` optional.

### Tag Detail

- Title template: `{Tag Name} Guides | GameVault Guides`
- Meta description: Tag-specific archive description.
- Canonical: `/tags/[slug]`
- Open Graph: tag archive metadata.
- Breadcrumb: `Home > Tags > {Tag Name}`
- JSON-LD: `CollectionPage` optional.

### Author Detail

- Title template: `{Author Name} Guides | GameVault Guides`
- Meta description: Author bio and expertise summary.
- Canonical: `/authors/[slug]`
- Open Graph: author profile metadata.
- Breadcrumb: `Home > Authors > {Author Name}`
- JSON-LD:
  - `ProfilePage`
  - `Person`

## 6. Internal Linking Rules

Homepage:

- Link to `/games`.
- Link to popular `/games/[slug]` pages.
- Link to latest `/guides/[slug]` pages.
- Link to category pages.
- Link to `/guides#search` or `/search`.

Game pages:

- Link to latest guides for the game.
- Link to guide category sections on the same page.
- Link to `/guides/[slug]` pages.
- Link to `/guides` for broader browsing.

Guide pages:

- Link to the parent game page.
- Link to the guide category page.
- Link to every tag page used by the guide.
- Link to explicitly related guides.
- Link to previous and next guides.
- Link table of contents items to in-page headings.

Category pages:

- Link to all guides in the category.
- Link guide cards back to game pages and guide detail pages.

Tag pages:

- Link to all guides with that tag.
- Link guide cards back to game pages and guide detail pages.

Author pages:

- Link to all guides by the author.
- Link to reviewed guides if reviewer archive is added.

## 7. AI Content Workflow

The AI-assisted publishing workflow:

```text
keyword → content brief → MDX draft → validation → build → git commit → deployment
```

Step details:

1. Keyword
   - Choose a target game, intent, category, and keyword cluster.
   - Confirm search intent: beginner, build, boss, map, quest, tier list, walkthrough, or troubleshooting.

2. Content brief
   - Define title, slug, game, category, tags, outline, FAQ, internal links, and content freshness notes.
   - Confirm whether the guide needs patch or version context.

3. MDX draft
   - Generate MDX using the standard Guide frontmatter.
   - Include useful headings that can become a table of contents.
   - Add FAQ items when there are clear search questions.

4. Validation
   - Validate required frontmatter fields.
   - Confirm `game`, `category`, `author`, and related guide slugs exist.
   - Confirm no duplicate slugs.
   - Confirm all images have alt text.

5. Build
   - Run `npm run build`.
   - Fix all build, type, and static-generation errors.

6. Git commit
   - Commit only intentional content and code changes.
   - Use clear commit messages.

7. Deployment
   - Push to GitHub.
   - Deploy through the standard Vercel Next.js workflow.

## 8. Deployment Workflow

Standard deployment flow:

```text
local dev -> npm run build -> git commit -> git push -> GitHub -> Vercel
```

Local development:

- Run `npm run dev`.
- Validate pages in the browser.
- Keep content data reads deterministic so guide and dashboard pages can be prerendered during the build.

Build:

- Run `npm run build`.
- Production uses the standard Next.js build output consumed by the Vercel Next.js Builder.
- Dynamic routes must export `generateStaticParams`.

Git:

- Review changed files.
- Commit intentional changes.
- Push to GitHub.

Vercel:

- Use the Next.js framework preset with no custom Output Directory.
- Do not add `output: "export"` or depend on an `out` directory.
- Confirm the deployment route list includes the dashboard and all generated content routes.

## 9. Scaling Rules

The system should support 100+ games and 10,000+ guides by following these rules:

- Never hardcode game, guide, category, tag, or author content in page templates.
- Use `content/` files as the source of truth.
- Keep slugs stable and unique.
- Keep route generation based on content helpers in `lib/content.ts`.
- Avoid expensive client-side filtering over all content when pages become large.
- Move search to a prebuilt index when guide count becomes large.
- Keep guide pages statically generated.
- Keep images compatible with Next.js image optimization and use meaningful alt text.
- Split large content helper logic into smaller modules if `lib/content.ts` becomes difficult to maintain.
- Add validation scripts before bulk publishing AI-generated MDX.
- Prefer explicit related links in frontmatter, then fallback to game/category/tag matching.
- Use pagination or segmented archives when category/tag pages become too large.
- Keep reusable UI in `components/` and `components/ui/`.

## 10. Codex Development Rules

Codex must follow these rules for future development:

- Do not break existing routes.
- Do not hardcode content that belongs in `content/`.
- Prefer existing content helpers in `lib/content.ts`.
- Prefer reusable components before adding page-specific markup.
- Keep visual design consistent with the dark GameVault design system.
- All dynamic routes must export `generateStaticParams`.
- Content-backed dynamic routes should export `dynamicParams = false` so unknown slugs return 404.
- Keep Vercel deployment on the standard Next.js Builder with no custom Output Directory.
- Dashboard and content collection data must be read from local files during prerendering.
- Every development task must end with `npm run build`.
- If the build fails, fix the failure before ending.
- Do not delete existing pages or content unless explicitly requested.
- Keep MDX frontmatter aligned with the Guide content model.
- Use semantic links and accessible alt text.
- Keep SEO metadata, canonical URLs, and JSON-LD aligned with normalized content data.
