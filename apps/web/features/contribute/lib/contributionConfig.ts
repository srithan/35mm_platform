import type { ContributionKind } from "@35mm/types";

export type ContributionSlug =
  | "add-title"
  | "edit-title"
  | "credits"
  | "person-update"
  | "media"
  | "awards-events"
  | "duplicate-titles"
  | "merge-people"
  | "split-person";

export type ContributionField =
  | {
      name: string;
      label: string;
      type: "text" | "number" | "textarea";
      required?: boolean;
      placeholder?: string;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      required?: boolean;
      options: Array<{ value: string; label: string }>;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      type: "checkboxGroup";
      required?: boolean;
      options: Array<{ value: string; label: string }>;
      hint?: string;
    };

export type ContributionConfig = {
  kind: ContributionKind;
  slug: ContributionSlug;
  title: string;
  shortTitle: string;
  description: string;
  queueLabel: string;
  fields: ContributionField[];
};

export const CONTRIBUTION_CONFIGS: ContributionConfig[] = [
  {
    kind: "add_title",
    slug: "add-title",
    title: "Add a title",
    shortTitle: "Add title",
    description: "Submit a missing film, show, or episode with sources and core catalog metadata.",
    queueLabel: "Catalog intake",
    fields: [
      {
        name: "titleType",
        label: "Title type",
        type: "select",
        required: true,
        options: [
          { value: "film", label: "Film" },
          { value: "show", label: "Show" },
          { value: "episode", label: "Episode" },
        ],
      },
      { name: "originalTitle", label: "Original title", type: "text", required: true },
      { name: "displayTitle", label: "English or display title", type: "text" },
      { name: "releaseYear", label: "Release year", type: "number", required: true, placeholder: "1999" },
      { name: "durationMinutes", label: "Runtime in minutes", type: "number", placeholder: "121" },
      { name: "imdbUrl", label: "IMDb URL or external ID", type: "text", placeholder: "https://www.imdb.com/title/tt..." },
      { name: "countries", label: "Countries", type: "text", hint: "Comma-separated." },
      { name: "languages", label: "Languages", type: "text", hint: "Comma-separated." },
      { name: "genres", label: "Genres", type: "text", hint: "Comma-separated." },
      { name: "synopsis", label: "Short synopsis", type: "textarea", required: true },
      {
        name: "sourceUrls",
        label: "Sources",
        type: "textarea",
        required: true,
        hint: "One source per line. Official sites, festival pages, press kits, IMDb, or distributor pages.",
      },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "edit_title",
    slug: "edit-title",
    title: "Edit title details",
    shortTitle: "Edit title",
    description: "Correct title metadata, synopsis, release details, relations, awards, or credits.",
    queueLabel: "Catalog correction",
    fields: [
      { name: "targetTitle", label: "35mm title URL or ID", type: "text", required: true },
      {
        name: "changeAreas",
        label: "Change areas",
        type: "checkboxGroup",
        required: true,
        options: [
          { value: "title", label: "Title" },
          { value: "release", label: "Release" },
          { value: "runtime", label: "Runtime" },
          { value: "countries", label: "Countries" },
          { value: "languages", label: "Languages" },
          { value: "genres", label: "Genres" },
          { value: "synopsis", label: "Synopsis" },
          { value: "credits", label: "Credits" },
          { value: "relations", label: "Relations" },
          { value: "awards", label: "Awards" },
        ],
      },
      { name: "requestedChanges", label: "Requested changes", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "credits",
    slug: "credits",
    title: "Cast and crew credits",
    shortTitle: "Credits",
    description: "Add, edit, or remove credited cast and crew entries on a title.",
    queueLabel: "Credit review",
    fields: [
      { name: "targetTitle", label: "35mm title URL or ID", type: "text", required: true },
      {
        name: "action",
        label: "Action",
        type: "select",
        required: true,
        options: [
          { value: "add", label: "Add credit" },
          { value: "edit", label: "Edit credit" },
          { value: "remove", label: "Remove credit" },
        ],
      },
      { name: "personName", label: "Person name", type: "text", required: true },
      { name: "personUrlOrId", label: "Existing person URL or ID", type: "text" },
      { name: "job", label: "Credit or job", type: "text", required: true, placeholder: "Director, Actor, Editor" },
      { name: "characterName", label: "Character name", type: "text" },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "person_update",
    slug: "person-update",
    title: "Update a person page",
    shortTitle: "Person update",
    description: "Correct names, primary job, biography, images, duplicate notes, and person metadata.",
    queueLabel: "People data",
    fields: [
      { name: "personUrlOrId", label: "35mm person URL or ID", type: "text", required: true },
      {
        name: "changeType",
        label: "Change type",
        type: "select",
        required: true,
        options: [
          { value: "name", label: "Name correction" },
          { value: "primary_job", label: "Primary job" },
          { value: "biography", label: "Biography" },
          { value: "image", label: "Image" },
          { value: "duplicate", label: "Duplicate" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "requestedChanges", label: "Requested changes", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "media",
    slug: "media",
    title: "Images and trailers",
    shortTitle: "Media",
    description: "Add, replace, or remove title/person images and trailers with rights context.",
    queueLabel: "Asset review",
    fields: [
      { name: "target", label: "Title/person URL or ID", type: "text", required: true },
      {
        name: "mediaType",
        label: "Media type",
        type: "select",
        required: true,
        options: [
          { value: "image", label: "Image" },
          { value: "trailer", label: "Trailer" },
        ],
      },
      {
        name: "action",
        label: "Action",
        type: "select",
        required: true,
        options: [
          { value: "add", label: "Add" },
          { value: "edit", label: "Replace or edit" },
          { value: "remove", label: "Remove" },
        ],
      },
      { name: "mediaUrl", label: "Media URL or existing asset reference", type: "text", required: true },
      { name: "rightsNote", label: "Rights note", type: "textarea", required: true },
      { name: "sourceUrls", label: "Supporting sources", type: "textarea", hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "awards_events",
    slug: "awards-events",
    title: "Awards and festivals",
    shortTitle: "Awards",
    description: "Request a missing award or festival event, or correct existing event metadata.",
    queueLabel: "Event data",
    fields: [
      {
        name: "eventType",
        label: "Event type",
        type: "select",
        required: true,
        options: [
          { value: "award", label: "Award" },
          { value: "festival", label: "Festival" },
        ],
      },
      { name: "originalName", label: "Original name", type: "text", required: true },
      { name: "englishName", label: "English name", type: "text" },
      { name: "officialUrl", label: "Official verification URL", type: "text", required: true },
      { name: "startYear", label: "Start year", type: "number" },
      { name: "endYear", label: "End year", type: "number" },
      { name: "requestedChanges", label: "Requested addition or change", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "duplicate_titles",
    slug: "duplicate-titles",
    title: "Duplicate titles",
    shortTitle: "Duplicates",
    description: "Flag duplicate film, show, or episode pages before they fragment activity.",
    queueLabel: "Identity cleanup",
    fields: [
      { name: "primaryTitle", label: "Canonical title URL or ID", type: "text", required: true },
      { name: "duplicateTitle", label: "Duplicate title URL or ID", type: "text", required: true },
      { name: "reason", label: "Why these are duplicates", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "merge_people",
    slug: "merge-people",
    title: "Merge people",
    shortTitle: "Merge people",
    description: "Merge duplicate cast/crew pages into one canonical person.",
    queueLabel: "People identity",
    fields: [
      { name: "primaryPerson", label: "Canonical person URL or ID", type: "text", required: true },
      { name: "duplicatePeople", label: "Duplicate person URLs or IDs", type: "textarea", required: true, hint: "One per line." },
      { name: "reason", label: "Why these pages should merge", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
  {
    kind: "split_person",
    slug: "split-person",
    title: "Split a person page",
    shortTitle: "Split person",
    description: "Move credits from one person page into separate people when identities were combined.",
    queueLabel: "People identity",
    fields: [
      { name: "sourcePerson", label: "Current person URL or ID", type: "text", required: true },
      { name: "creditsToMove", label: "Credits to move", type: "textarea", required: true, hint: "One title or credit per line." },
      { name: "reason", label: "Why this page should split", type: "textarea", required: true },
      { name: "sourceUrls", label: "Sources", type: "textarea", required: true, hint: "One source per line." },
      { name: "comments", label: "Reviewer notes", type: "textarea" },
    ],
  },
];

export const CONTRIBUTION_CONFIG_BY_SLUG = new Map(
  CONTRIBUTION_CONFIGS.map(function (config) {
    return [config.slug, config] as const;
  })
);

export const CONTRIBUTION_CONFIG_BY_KIND = new Map(
  CONTRIBUTION_CONFIGS.map(function (config) {
    return [config.kind, config] as const;
  })
);
