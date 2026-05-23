export type PeopleSuggestionRole =
  | "Director"
  | "DP"
  | "Editor"
  | "Critic"
  | "Festival"
  | "Producer"
  | "Cinephile";

export interface PeopleSuggestion {
  username: string;
  name: string;
  role: PeopleSuggestionRole;
  location: string;
  headline: string;
  bio: string;
  reason: string;
  posts: number;
  followers: number;
  following: number;
  knownFor: string[];
  isFollowing?: boolean;
}

export const PEOPLE_SUGGESTIONS: PeopleSuggestion[] = [
  {
    username: "cthurmanrea",
    name: "C. Thurman Rea",
    role: "Director",
    location: "London",
    headline: "Short-form director building warm, observational dramas.",
    bio: "Writes about low-budget sets, non-actors, and small emotional turns that make a film feel lived in.",
    reason: "Followed by mononoke_hime",
    posts: 214,
    followers: 1840,
    following: 322,
    knownFor: ["Short films", "Microbudget", "Actor direction"],
  },
  {
    username: "border_wulf",
    name: "Ivo Wulf",
    role: "Critic",
    location: "Berlin",
    headline: "Sharp festival notes with a soft spot for strange genre films.",
    bio: "Tracks repertory screenings, midnight premieres, and the politics hiding in beautiful framing.",
    reason: "Followed by cineastes_unite",
    posts: 489,
    followers: 2360,
    following: 618,
    knownFor: ["Berlinale", "Genre cinema", "Essays"],
  },
  {
    username: "reel_roots",
    name: "Maya Okonkwo",
    role: "Producer",
    location: "Lagos",
    headline: "Producer connecting indie directors with practical festival paths.",
    bio: "Shares grant notes, pitch deck teardown threads, and distribution advice for first and second features.",
    reason: "Suggested for you",
    posts: 156,
    followers: 1280,
    following: 274,
    knownFor: ["Funding", "Distribution", "African cinema"],
  },
  {
    username: "_framebyframe",
    name: "Anika Frey",
    role: "Editor",
    location: "Budapest",
    headline: "Editor obsessed with rhythm, silence, and impossible cuts.",
    bio: "Posts timeline breakdowns, scene studies, and tiny notes on how performances change in the edit.",
    reason: "Followed by analogue_love",
    posts: 342,
    followers: 3190,
    following: 441,
    knownFor: ["Editing", "Scene studies", "Workflow"],
  },
  {
    username: "nightmoves_doc",
    name: "Theo Marin",
    role: "DP",
    location: "Mexico City",
    headline: "Documentary cinematographer chasing practical light.",
    bio: "Shares lighting diagrams, camera tests, and field notes from verite shoots that refuse to behave.",
    reason: "Suggested for you",
    posts: 271,
    followers: 2110,
    following: 390,
    knownFor: ["Documentary", "Natural light", "Camera tests"],
  },
  {
    username: "nora.dop",
    name: "Nora Valette",
    role: "DP",
    location: "Paris",
    headline: "DP for tactile, intimate character pieces.",
    bio: "A careful eye for skin tones, window light, and the small lens choices that change a scene's temperature.",
    reason: "Because you follow cinematographers",
    posts: 198,
    followers: 1640,
    following: 305,
    knownFor: ["16mm", "Portrait lighting", "French indie"],
  },
  {
    username: "k.szabo",
    name: "Kata Szabo",
    role: "Editor",
    location: "Budapest",
    headline: "Editor cutting character-first thrillers and festival shorts.",
    bio: "Writes about pacing, temp sound, and making transitions disappear without making them bland.",
    reason: "Popular with editors you follow",
    posts: 223,
    followers: 1420,
    following: 352,
    knownFor: ["Thrillers", "Sound bridges", "Shorts"],
  },
  {
    username: "t.osei",
    name: "Tariq Osei",
    role: "Director",
    location: "Accra",
    headline: "Director of intimate city stories and restrained melodramas.",
    bio: "Shares casting notes, festival journals, and scene references from West African cinema.",
    reason: "Suggested from your taste",
    posts: 147,
    followers: 980,
    following: 211,
    knownFor: ["Drama", "Casting", "Ghanaian cinema"],
  },
  {
    username: "sundance_iris",
    name: "Iris Bell",
    role: "Festival",
    location: "Park City",
    headline: "Programmer watching first features and bold shorts.",
    bio: "Posts submission advice, discovery threads, and what makes a short feel complete instead of small.",
    reason: "Festival programmers near your interests",
    posts: 305,
    followers: 4210,
    following: 733,
    knownFor: ["Programming", "Shorts", "Debuts"],
  },
  {
    username: "matinee.notes",
    name: "Leah Tan",
    role: "Cinephile",
    location: "Singapore",
    headline: "Watching restorations, new waves, and perfect third acts.",
    bio: "A high-signal diary of repertory screenings, Asian cinema deep cuts, and smart capsule reviews.",
    reason: "Your recent logs overlap",
    posts: 612,
    followers: 1760,
    following: 810,
    knownFor: ["Restorations", "Asian cinema", "Diaries"],
  },
];

export const SIDEBAR_PEOPLE_SUGGESTIONS = PEOPLE_SUGGESTIONS.slice(0, 5);
