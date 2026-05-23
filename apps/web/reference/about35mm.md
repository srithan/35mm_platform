# 35mm — Platform Reference Document

> This document is the single source of truth for what 35mm is, what it does, and how its features are defined. It is intended to give Cursor, AI assistants, and new contributors full context before touching any part of the codebase.

---

## What is 35mm?

35mm is a social network built for film lovers, cinephiles, and filmmakers. It is the intersection of two things: a **film logging and discovery platform** (think Letterboxd) and a **professional social network for the film industry** (think Twitter, but for people who make and obsess over films).

The primary idea is the **social layer** — people connecting around cinema, sharing what they watched, what they made, what they think, and where they're going. The film data layer (powered by TMDB) supports and enriches that social experience.

**In one sentence:** 35mm is where film lovers log what they watch, filmmakers share what they make, and the community around cinema lives.

---

## Primary Users

There are two overlapping user types, both equally important:

**1. Film Lovers / Cinephiles**
People who watch films seriously. They log what they watch, write reviews, build lists, track their diary, discover new films, and discuss cinema with others. They may not make films professionally but they care deeply about the medium.

**2. Filmmakers / Film Professionals**
Directors, cinematographers, editors, sound designers, producers, festival programmers, and others who work in film. They use 35mm to share their work, discuss craft, follow other professionals, submit to festivals, and build a professional presence in the film community.

---

## Core Features

### 1. Authentication
- Sign up / Log in (email + password, OAuth options)
- Email verification required before accessing the feed
- After verification → redirected to feed with onboarding overlay
- Onboarding collects: film industries they follow (Bollywood, Tollywood, Hollywood, Korean Cinema, etc.), favourite genres, 3–5 seed films they love, and their primary use of the platform

---

### 2. Social Graph
Users can:
- **Follow / Unfollow** other users — following someone means their posts, logs, and activity appear in your feed
- **Block** a user — removes them from your feed and prevents interaction
- **Mute** a user — hides their content from your feed without notifying them
- **Message** users directly — private 1:1 messaging

---

### 3. Posts (The Feed)

Posts are the core content unit of 35mm. A post is not just a tweet — it is a contextual piece of content that can take multiple forms:

#### Post Types

| Type | Description |
|---|---|
| **Text Post** | A standalone thought, question, or observation. No film attached. |
| **Film Review** | A written review attached to a specific film. Has a star rating (0.5–5 stars). The film card (poster, title, director, year, runtime) is embedded in the post. |
| **Film Log** | A quick log of a watched film. Shorter than a review. Has a star rating. Shows the film card. Marked with a "Logged" badge. |
| **Image Post** | A post with one or more images attached. Used for behind-the-scenes, stills, grade tests, set photos, etc. |
| **Discussion** | A question or prompt directed at the community. Shows a thread preview of top replies inline in the feed. |
| **Festival Dispatch** | A post tagged to a specific film festival. Marked with a festival badge (e.g. "BERLINALE '26"). Appears differently in the feed — gold accent, warm background. |
| **Quote Post** | A repost of another post with added commentary. Shows the original post embedded below the quote text. |

#### Post Actions
Every post has the following actions:
- **Like** — heart icon, count shown
- **Comment** — opens comment thread
- **Repost** — reposts to your followers' feeds without commentary
- **Quote** — reposts with your own added text
- **Save** — bookmarks the post to your saved collection
- **Share** — external share (copy link, share sheet)

---

### 4. Activity Attribution

Activity attribution explains **why a post is appearing in your feed** when it is not a direct post from someone you follow. It appears as a small contextual label above the post.

There are three types of activity attribution:

#### 4a. Repost Attribution
When a user you follow reposts someone else's post, you see that post in your feed with the label:

> **↺ [username] reposted**

The post shown is the original post — not the reposter's post. The reposter's name is the attribution.

#### 4b. Comment Attribution
When a user you follow comments on a post, you see that post in your feed with the label:

> **💬 [username] commented on this**

Below the original post, the specific comment made by the person you follow is shown immediately — so you can see what they said without clicking through.

#### 4c. Mention Attribution
When a user you follow is mentioned in a post by someone you don't follow, that post may surface in your feed with:

> **@ [username] was mentioned**

This surfaces relevant content from outside your direct follow graph.

#### 4d. Topic Attribution
When a post is tagged with a topic or festival you follow (e.g. #Berlinale2026, #Tollywood, #SlowCinema), it appears with:

> **# You follow [topic]**

With an inline **Unfollow** button so users can immediately remove the topic from their feed without navigating away.

**Important:** Do NOT show "You follow [username]" as an attribution — users already know they follow the people they follow. That label is redundant and adds noise.

---

### 5. Feed

The feed is the central timeline. It is a curated, chronological-ish stream of:
- Posts from people you follow
- Posts surfaced via activity attribution (repost, comment, mention, topic)
- Personalised "For You" content based on onboarding preferences and activity

#### Feed Tabs
- **Your Feed** — people you follow + activity attribution
- **For You** — personalised recommendations based on industries, genres, and seed films selected at onboarding
- **Drafts** — saved unpublished posts

#### Desktop Layout
Three-column layout:
- **Left sidebar** — navigation, user account, New Post button
- **Center column** — the feed timeline (max-width ~620px)
- **Right sidebar** — trending films this week, suggested filmmakers to follow, active festivals

#### Mobile Layout
- Bottom navigation bar (Feed, Discover, Festivals, Chat, Notifications)
- Floating + button for new post
- Single column feed

---

### 6. Film Discovery (Discover Tab)

Powered entirely by the TMDB API. All film data — posters, metadata, ratings, genres — comes from TMDB.

#### Discover Sub-tabs
- **Explore** — Hero film (Editor's Pick from popular), genre filter strip, Popular Right Now shelf, Now Playing shelf
- **Trending** — Ranked list format (1–20), week/day toggle, maps to TMDB `/trending/movie/week` and `/trending/movie/day`
- **Top Rated** — Paginated grid, genre-filterable, maps to TMDB `/movie/top_rated`

#### Regional Personalisation
- All TMDB calls use `region=IN` to surface Indian content alongside global content
- Users who select Tollywood, Bollywood, etc. at onboarding see dedicated shelves for those industries using TMDB's `with_original_language` parameter (`te` for Telugu, `hi` for Hindi, `ta` for Tamil, etc.)

#### Genre Filter
- Fetched from TMDB `/genre/movie/list`
- Multi-row wrapping layout on desktop (no horizontal scroll)
- Single-row horizontal scroll on mobile

#### Search
- Full-width search bar above genre filters on both desktop and mobile
- Powered by TMDB `/search/movie`
- Debounced 400ms
- Results replace the page sections while query is active

#### Caching
- All TMDB fetch calls use Next.js native `{ next: { revalidate: 86400 } }` (24-hour server-side cache)
- No TanStack Query — server-side caching is preferred at scale because it is shared across all users (one TMDB request per 24 hours regardless of traffic volume)

---

### 7. Film Pages

Each film has its own page on 35mm, populated from TMDB data + user-generated content:
- Film metadata (poster, backdrop, title, director, cast, runtime, genres, languages)
- Community rating (aggregated from 35mm user logs)
- TMDB rating (displayed separately)
- Reviews written by 35mm users
- Lists this film appears in
- Who in your network has logged this film

---

### 8. Film Lists

Users can:
- **Create lists** — curated collections of films with a title, description, and ordered ranking
- **Browse lists** — discover lists made by other users
- Lists can be public or private
- Lists appear on the user's profile

---

### 9. Watchlist

Each user has a personal watchlist — films they want to watch. Adding a film to a watchlist is a one-tap action available on any film card throughout the platform.

---

### 10. Watch Diary & Stats

Users can log every film they watch with:
- Date watched
- Star rating (0.5–5 in 0.5 increments)
- Rewatch flag (if they've seen it before)
- Short note (optional)

The diary is a chronological record of everything the user has watched. Stats on the profile show:
- Total films logged
- Films this year / month
- Favourite genres (derived from logs)
- Favourite directors (derived from logs)
- Average rating given
- Films by country, decade, language

---

### 11. Film Festivals

35mm has a dedicated festivals layer — this is a differentiator from other film platforms.

Users can:
- **Browse festivals** — discover upcoming and ongoing film festivals worldwide
- **Follow festivals** — get posts tagged to that festival in their feed
- **Apply to festivals** — submit a project for consideration (see Projects below)
- **Track submissions** — see the status of their festival submissions (submitted, shortlisted, selected, rejected)

Festival posts appear in the feed with a festival badge and a distinct warm gold visual treatment.

---

### 12. Projects

Projects are a filmmaker-specific feature. A project represents a film or video work that a filmmaker is developing, producing, or has completed. Projects are required for festival submissions.

A project contains:
- Title
- Logline / synopsis
- Genre(s)
- Format (short, feature, documentary, etc.)
- Runtime
- Production status (development, production, post-production, completed)
- Team members / collaborators
- Film stills / trailer link
- Festival submission history

Projects live on the filmmaker's profile and can be submitted to festivals directly from within 35mm.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Package Manager | pnpm |
| Animation | Framer Motion |
| URL State | nuqs |
| Film Data API | TMDB (The Movie Database) |
| Deployment | Vercel |
| Analytics | Vercel Analytics + Speed Insights |

**Database, auth provider, and ORM:** To be documented once confirmed.

---

## TMDB Integration

- Base image URL: `https://image.tmdb.org/t/p/`
- Poster sizes used: `w342` (cards), `w500` (carousel), `w780` (hero/featured)
- API key stored in environment variable: `TMDB_API_KEY`
- All fetch calls use Next.js `{ next: { revalidate: 86400 } }` for 24-hour server-side caching
- `Promise.allSettled` used for parallel fetches — individual failures are skipped silently
- Films with no `poster_path` are filtered out before rendering
- `vote_average` is divided by 2 to convert TMDB's 10-point scale to 35mm's 5-star scale
- `release_date` (format: YYYY-MM-DD) is displayed as 4-digit year only
- `vote_count` is formatted with short notation: `12.4k`, `1.2M`

---

## Key Terminology

| Term | Meaning in 35mm |
|---|---|
| **Post** | Any piece of content published to the feed |
| **Log** | Recording that you watched a film, with a rating and optional note |
| **Review** | A longer written piece about a film, attached to a post |
| **Watchlist** | Films you intend to watch |
| **Diary** | Your chronological history of logged films |
| **List** | A curated, titled collection of films |
| **Project** | A filmmaker's work-in-progress or completed film, used for festival submissions |
| **Festival Dispatch** | A post tagged to a specific film festival |
| **Activity Attribution** | A label above a feed post explaining why it appears (repost, comment, mention, topic) |
| **For You** | Personalised feed tab, distinct from the social follow graph feed |
| **Industry** | A national/regional film industry (Bollywood, Tollywood, Hollywood, etc.) used for personalisation |

---

## What is NOT built yet (as of Feb 2026)

- Onboarding overlay (designed, not implemented)
- Projects feature (designed, not implemented)
- Festival submission flow (designed, not implemented)
- Activity attribution in feed (designed, not implemented)
- Regional personalisation via TMDB language params (partially implemented)
- Trending and Top Rated tab layouts (basic implementation, needs redesign)
- Watch diary stats on profile (not implemented)

---

*Last updated: February 2026. Update this document whenever a feature is defined, changed, or shipped.*