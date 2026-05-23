import type {
  ChatMessage,
  ChatMessageReaction,
  ChatMessageReplyRef,
} from "../types";

/** Still photo — stable Unsplash image. */
const STILL_URL =
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=480&q=80";
/** Short GIF loop. */
const GIF_URL =
  "https://media.giphy.com/media/l0MYC0LajqoPoEADK/giphy.gif";

export interface SeedMessageRow {
  id: string;
  text: string;
  isOwn: boolean;
  createdAt: string;
  media?: ChatMessage["media"];
  file?: ChatMessage["file"];
  reactions?: ChatMessageReaction[];
  replyTo?: ChatMessageReplyRef;
}

export const SEED_THREADS: Record<string, SeedMessageRow[]> = {
  "1": [
    { id: "m1", text: "You free tonight?", isOwn: true, createdAt: "2026-03-28T08:10:00.000Z" },
    { id: "m2", text: "Yeah — what’s up?", isOwn: false, createdAt: "2026-03-28T08:11:00.000Z" },
    { id: "m3", text: "Anora. Midnight.", isOwn: true, createdAt: "2026-03-28T08:12:00.000Z" },
    { id: "m4", text: "In.", isOwn: false, createdAt: "2026-03-28T08:12:30.000Z" },
    { id: "m5", text: "🙌", isOwn: true, createdAt: "2026-03-28T08:13:00.000Z" },
    {
      id: "m6",
      text: "",
      isOwn: false,
      createdAt: "2026-03-28T08:40:00.000Z",
      media: { type: "image", url: STILL_URL },
    },
    { id: "m7", text: "From the lobby", isOwn: false, createdAt: "2026-03-28T08:40:10.000Z" },
    { id: "m8", text: "Gorgeous", isOwn: true, createdAt: "2026-03-28T08:41:00.000Z" },
    {
      id: "m9",
      text: "Right??",
      isOwn: false,
      createdAt: "2026-03-28T08:42:00.000Z",
      replyTo: { id: "m8", snippet: "Gorgeous", isOwn: true },
    },
    {
      id: "m10",
      text: "Grain in the club scene 😭",
      isOwn: true,
      createdAt: "2026-03-28T09:05:00.000Z",
      reactions: [{ emoji: "❤️", count: 0, includesMe: false }],
    },
    { id: "m11", text: "Q&A Saturday?", isOwn: false, createdAt: "2026-03-28T09:08:00.000Z" },
    { id: "m12", text: "Yep. Coffee before?", isOwn: true, createdAt: "2026-03-28T09:09:00.000Z" },
    { id: "m13", text: "11 at Saint Frank?", isOwn: false, createdAt: "2026-03-28T09:10:00.000Z" },
    { id: "m14", text: "Locked.", isOwn: true, createdAt: "2026-03-28T09:11:00.000Z" },
    {
      id: "m15",
      text: "Still thinking about that print",
      isOwn: false,
      createdAt: "2026-03-28T14:35:00.000Z",
      reactions: [{ emoji: "👍", count: 1, includesMe: true }],
    },
  ],
  "2": [
    { id: "m1", text: "Watch Parasite yet?", isOwn: true, createdAt: "2026-03-27T18:00:00.000Z" },
    { id: "m2", text: "Tonight", isOwn: false, createdAt: "2026-03-27T18:02:00.000Z" },
    { id: "m3", text: "Lmk", isOwn: true, createdAt: "2026-03-27T18:03:00.000Z" },
    {
      id: "m4",
      text: "",
      isOwn: false,
      createdAt: "2026-03-28T11:20:00.000Z",
      media: { type: "gif", url: GIF_URL },
    },
    { id: "m5", text: "That ending", isOwn: false, createdAt: "2026-03-28T11:21:00.000Z" },
    { id: "m6", text: "Told you", isOwn: true, createdAt: "2026-03-28T11:22:00.000Z" },
    { id: "m7", text: "Rewatching tomorrow", isOwn: false, createdAt: "2026-03-28T11:45:00.000Z" },
  ],
  "3": [
    { id: "m1", text: "Berlinale?", isOwn: false, createdAt: "2026-03-26T09:00:00.000Z" },
    { id: "m2", text: "Trying", isOwn: true, createdAt: "2026-03-26T09:15:00.000Z" },
    { id: "m3", text: "Shorts or features?", isOwn: false, createdAt: "2026-03-26T09:16:00.000Z" },
    { id: "m4", text: "Features + one midnight genre", isOwn: true, createdAt: "2026-03-26T09:18:00.000Z" },
    { id: "m5", text: "Same", isOwn: false, createdAt: "2026-03-26T09:19:00.000Z" },
    { id: "m6", text: "Share lodging?", isOwn: true, createdAt: "2026-03-26T14:00:00.000Z" },
    { id: "m7", text: "Maybe — budget?", isOwn: false, createdAt: "2026-03-26T14:30:00.000Z" },
    { id: "m8", text: "~120/night max", isOwn: true, createdAt: "2026-03-26T14:31:00.000Z" },
    { id: "m9", text: "Doable", isOwn: false, createdAt: "2026-03-26T15:00:00.000Z" },
    { id: "m10", text: "I’ll ping a group chat", isOwn: false, createdAt: "2026-03-28T12:22:00.000Z" },
  ],
  "4": [
    { id: "m1", text: "Night ext tests?", isOwn: true, createdAt: "2026-03-25T16:00:00.000Z" },
    { id: "m2", text: "500T + 1 stop push", isOwn: false, createdAt: "2026-03-25T16:10:00.000Z" },
    { id: "m3", text: "Skin holds?", isOwn: true, createdAt: "2026-03-25T16:12:00.000Z" },
    { id: "m4", text: "Beautiful", isOwn: false, createdAt: "2026-03-25T16:15:00.000Z" },
    {
      id: "m5",
      text: "Notes",
      isOwn: false,
      createdAt: "2026-03-27T18:00:00.000Z",
      file: { name: "night_ext_lut_notes.pdf", sizeLabel: "240 KB" },
    },
  ],
  "5": [
    { id: "m1", text: "v2 LUT pack is up", isOwn: false, createdAt: "2026-03-28T07:00:00.000Z" },
    { id: "m2", text: "Legend", isOwn: true, createdAt: "2026-03-28T07:02:00.000Z" },
    { id: "m3", text: "Warm shadows only on reel 2", isOwn: false, createdAt: "2026-03-28T07:05:00.000Z" },
    { id: "m4", text: "Copy", isOwn: true, createdAt: "2026-03-28T07:06:00.000Z" },
  ],
  "6": [
    { id: "m1", text: "Location scout Sunday", isOwn: false, createdAt: "2026-03-27T10:00:00.000Z" },
    { id: "m2", text: "Can do AM", isOwn: true, createdAt: "2026-03-27T10:05:00.000Z" },
    { id: "m3", text: "9?", isOwn: false, createdAt: "2026-03-27T10:06:00.000Z" },
    { id: "m4", text: "Works", isOwn: true, createdAt: "2026-03-27T10:07:00.000Z" },
    { id: "m5", text: "Pin dropped", isOwn: false, createdAt: "2026-03-27T10:08:00.000Z" },
    { id: "m6", text: "☕️ after?", isOwn: true, createdAt: "2026-03-28T06:30:00.000Z" },
    { id: "m7", text: "Always", isOwn: false, createdAt: "2026-03-28T06:31:00.000Z" },
  ],
  "7": [
    { id: "m1", text: "Stage B free Thu 2–6?", isOwn: true, createdAt: "2026-03-28T05:00:00.000Z" },
    { id: "m2", text: "Thu open. Want lights?", isOwn: false, createdAt: "2026-03-28T05:05:00.000Z" },
    { id: "m3", text: "Just camera + bounce", isOwn: true, createdAt: "2026-03-28T05:06:00.000Z" },
    { id: "m4", text: "Booked ✓", isOwn: false, createdAt: "2026-03-28T05:08:00.000Z" },
  ],
  "8": [
    { id: "m1", text: "Lens test stills", isOwn: false, createdAt: "2026-03-27T20:00:00.000Z" },
    {
      id: "m2",
      text: "",
      isOwn: false,
      createdAt: "2026-03-27T20:01:00.000Z",
      media: { type: "image", url: STILL_URL },
    },
    { id: "m3", text: "Cooke vs Master Prime", isOwn: false, createdAt: "2026-03-27T20:02:00.000Z" },
    { id: "m4", text: "Cooke for faces", isOwn: true, createdAt: "2026-03-27T20:10:00.000Z" },
    { id: "m5", text: "Agree", isOwn: false, createdAt: "2026-03-27T20:11:00.000Z" },
  ],
  "9": [
    { id: "m1", text: "Assembly v3 uploaded", isOwn: true, createdAt: "2026-03-28T04:00:00.000Z" },
    { id: "m2", text: "Watching now", isOwn: false, createdAt: "2026-03-28T04:05:00.000Z" },
    { id: "m3", text: "Act 2 trim is 🔥", isOwn: false, createdAt: "2026-03-28T04:22:00.000Z" },
    { id: "m4", text: "One note on bridge", isOwn: false, createdAt: "2026-03-28T04:25:00.000Z" },
    { id: "m5", text: "Send timecode", isOwn: true, createdAt: "2026-03-28T04:26:00.000Z" },
    { id: "m6", text: "48:12–49:40", isOwn: false, createdAt: "2026-03-28T04:27:00.000Z" },
  ],
  "10": [
    { id: "m1", text: "Rotterdam deadline Friday", isOwn: false, createdAt: "2026-03-26T12:00:00.000Z" },
    { id: "m2", text: "DCP or ProRes?", isOwn: true, createdAt: "2026-03-26T12:05:00.000Z" },
    { id: "m3", text: "DCP", isOwn: false, createdAt: "2026-03-26T12:06:00.000Z" },
    { id: "m4", text: "On it", isOwn: true, createdAt: "2026-03-26T12:07:00.000Z" },
  ],
  "11": [
    { id: "m1", text: "Room tone from alley ok?", isOwn: true, createdAt: "2026-03-27T22:00:00.000Z" },
    { id: "m2", text: "Little HVAC — I’ll notch", isOwn: false, createdAt: "2026-03-27T22:05:00.000Z" },
    { id: "m3", text: "Perfect", isOwn: true, createdAt: "2026-03-27T22:06:00.000Z" },
  ],
  "12": [
    { id: "m1", text: "BTS selects?", isOwn: false, createdAt: "2026-03-28T03:00:00.000Z" },
    { id: "m2", text: "50 in folder", isOwn: true, createdAt: "2026-03-28T03:10:00.000Z" },
    {
      id: "m3",
      text: "",
      isOwn: true,
      createdAt: "2026-03-28T03:11:00.000Z",
      media: { type: "image", url: STILL_URL },
    },
    { id: "m4", text: "This one for poster", isOwn: false, createdAt: "2026-03-28T03:15:00.000Z" },
  ],
};
