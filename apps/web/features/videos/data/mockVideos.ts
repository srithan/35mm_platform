const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
];

export const MOCK_VIDEOS = [
  {
    id: "v1",
    username: "maya.frames",
    avatar: "M",
    caption:
      "B-roll from yesterday's shoot on the Alexa. 16mm grain hits different when you're grading in DaVinci — had to pull the shadows way down to match the film stocks we're cross-cutting with.",
    videoUrl: SAMPLE_VIDEOS[0],
    likeCount: 135472,
    commentCount: 1033,
    timestamp: "4h",
  },
  {
    id: "v2",
    username: "oliver_cuts",
    avatar: "O",
    caption:
      "Colour grading test for the teal & orange pull. Still figuring out the skin tones — reference was Blade Runner 2049 but we're working with way less latitude.",
    videoUrl: SAMPLE_VIDEOS[1],
    likeCount: 41200,
    commentCount: 892,
    timestamp: "6h",
  },
  {
    id: "v3",
    username: "lena.montage",
    avatar: "L",
    caption:
      "Mulholland Dr. sequence breakdown for the edit class I'm teaching. Lynch's dream logic is impossible to replicate but we can at least steal the pacing.",
    videoUrl: SAMPLE_VIDEOS[2],
    likeCount: 56700,
    commentCount: 2341,
    timestamp: "9h",
  },
  {
    id: "v4",
    username: "rania.films",
    avatar: "R",
    caption:
      "Berlinale day 2 — caught the Romanian entry in the main competition. Stunning 35mm work, reminded me why I still shoot film whenever the budget allows.",
    videoUrl: SAMPLE_VIDEOS[3],
    likeCount: 28400,
    commentCount: 512,
    timestamp: "12h",
  },
  {
    id: "v5",
    username: "j.pellicola",
    avatar: "J",
    caption:
      "When the director finally says yes to the shot after seven takes. That feeling never gets old. Roll camera.",
    videoUrl: SAMPLE_VIDEOS[4],
    likeCount: 93300,
    commentCount: 1876,
    timestamp: "1d",
  },
  {
    id: "v6",
    username: "t.osei",
    avatar: "T",
    caption:
      "Sundance prep. Locked the first cut yesterday — now it's sound design and a very gentle colour pass. Terrified and excited in equal measure.",
    videoUrl: SAMPLE_VIDEOS[5],
    likeCount: 67800,
    commentCount: 1245,
    timestamp: "2d",
  },
];
