import type { Comment } from "@/features/feed/components/CommentCard";

const avatar = (
  initial: string,
  bg: string,
  color: string
): Pick<Comment, "avatarInitial" | "avatarBg" | "avatarColor"> => ({
  avatarInitial: initial,
  avatarBg: bg,
  avatarColor: color,
});

const g = (s: string) => `linear-gradient(135deg,${s})`;

/** Comments for post "6" — MarvelsGrantMan136: Backrooms | Official Teaser | A24 */
export const MOCK_COMMENTS_BACKROOMS: Comment[] = [
  {
    id: "b1",
    username: "Captainomericah",
    displayName: "Captainomericah",
    role: "Film Student",
    roleContext: "NYU Tisch",
    ...avatar("C", g("#3a2d4a,#2a1a3a"), "#b08fcc"),
    text: "Between the wallpaper poster and this trailer I'm just excited this marketing campaign isn't ruining any of the mystery.",
    timestamp: "9h ago",
    likeCount: 2400,
    replyCount: 4,
    replies: [
      {
        id: "b1-1",
        username: "lotcow20",
        displayName: "lotcow20",
        ...avatar("L", g("#2a3a4a,#1a2530"), "#7a9eb8"),
        text: 'The whole backrooms thing reminds me of Stephen King\'s Langoliers\nEdit: I believe the origin of this trope is "Five Characters in Search of an Exit" episode of The Twilight Zone from Christmas, 1961.\nOne of the absolute best episodes, written by one guy who never wrote anything else of note.\nBackrooms, Cube, Langoliers, etc all owe a debt to that episode.',
        timestamp: "9h ago · Edited 6h ago",
        likeCount: 575,
        replyCount: 0,
      },
      {
        id: "b1-2",
        username: "cloudcats",
        displayName: "cloudcats",
        ...avatar("C", g("#2d3a4a,#1a2530"), "#8a9ccc"),
        text: "Reminds of House of Leaves.",
        timestamp: "8h ago",
        likeCount: 96,
        replyCount: 1,
        replies: [
          {
            id: "b1-2-1",
            username: "Tremulant887",
            displayName: "Tremulant887",
            ...avatar("T", g("#3a2e1a,#2a2218"), "#c4a86a"),
            text: "Something between House of Leaves and a 90s Doom clone. I always got the creeps when running around in some of those games, same feeling these back rooms give me.",
            timestamp: "7h ago",
            likeCount: 25,
            replyCount: 1,
            replies: [
              {
                id: "b1-2-1-1",
                username: "digitalr0nin",
                displayName: "digitalr0nin",
                ...avatar("D", g("#1e3a2a,#1a2a22"), "#7acc9a"),
                text: "MyHouse.wad",
                timestamp: "7h ago",
                likeCount: 37,
                replyCount: 1,
                replies: [
                  {
                    id: "b1-2-1-1-1",
                    username: "GavinBelsonsAlexa",
                    displayName: "GavinBelsonsAlexa",
                    ...avatar("G", g("#e8e6e2,#d4d0ca"), "#4a4a4a"),
                    text: "That was way more interesting than it had any right to be. I feel bad for anyone just discovering it now and not being able to get into the metafictional ARG aspect of it.",
                    timestamp: "6h ago",
                    likeCount: 12,
                    replyCount: 1,
                    replies: [
                      {
                        id: "b1-2-1-1-1-1",
                        username: "TabrinLudd",
                        displayName: "TabrinLudd",
                        ...avatar("T", g("#2e2a1a,#2a2618"), "#b8b06a"),
                        text: "The full walkthroughs/reviews/video essays of myhouse.wad on YouTube were my intro to it and they are pretty comprehensive. Maybe you got more out of it at the time but I was alive and a doom player and only heard of it years later so it was still super interesting to learn about",
                        timestamp: "48m ago",
                        likeCount: 5,
                        replyCount: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "b1-3",
        username: "Voidafter181days",
        displayName: "Voidafter181days",
        ...avatar("V", g("#3a3a2a,#2a2a1a"), "#c4c46a"),
        text: '"This is not for you."',
        timestamp: "8h ago",
        likeCount: 3,
        replyCount: 1,
        replies: [
          {
            id: "b1-3-1",
            username: "EllipticPeach",
            displayName: "EllipticPeach",
            ...avatar("E", g("#2a3a4a,#1a2530"), "#7a9eb8"),
            text: "I'm currently slogging my way through it. Nobody told me I had to read each page 3 times!",
            timestamp: "7h ago",
            likeCount: 3,
            replyCount: 1,
            replies: [
              {
                id: "b1-3-1-1",
                username: "IllIIIIIII",
                displayName: "IllIIIIIII",
                ...avatar("I", g("#2a3a4a,#1a2530"), "#8aa8c4"),
                text: "You don't actually need to do that, the extraneous text is mostly filler",
                timestamp: "5h ago",
                likeCount: 8,
                replyCount: 0,
              },
            ],
          },
        ],
      },
      {
        id: "b1-4",
        username: "Chief_McCloud",
        displayName: "Chief_McCloud",
        ...avatar("C", g("#3a3a2a,#2a2a1a"), "#c4b86a"),
        text: "have you made it to the echo chapter yet?",
        timestamp: "7h ago",
        likeCount: 1,
        replyCount: 1,
        replies: [
          {
            id: "b1-4-1",
            username: "joeyjusticeco",
            displayName: "joeyjusticeco",
            ...avatar("J", g("#2d3a4a,#1a2838"), "#6a8fa8"),
            text: "It's so not worth it",
            timestamp: "4h ago",
            likeCount: 4,
            replyCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "b2",
    username: "TheNightstroke",
    displayName: "TheNightstroke",
    ...avatar("T", g("#2a2e3a,#1a1e2a"), "#8a9ccc"),
    text: "Do we think the film is going to be fully CG rendered, or are we thinking that's just for the teaser? I can't wrap my head around seeing live-action actors in this sort of environment, but we'll see.",
    timestamp: "9h ago",
    likeCount: 162,
    replyCount: 1,
    replies: [
      {
        id: "b2-1",
        username: "SomeBoxofSpoons",
        displayName: "SomeBoxofSpoons",
        ...avatar("S", g("#2e3a2a,#1a2a1a"), "#8acc8a"),
        text: "This looks like something rendered for this teaser, so I'd guess we'll get real sets. Not like that's expensive for this setting.",
        timestamp: "9h ago",
        likeCount: 125,
        replyCount: 1,
        replies: [
          {
            id: "b2-1-1",
            username: "willstr1",
            displayName: "willstr1",
            ...avatar("W", g("#3a2d2d,#2a1a1a"), "#c4a0a0"),
            text: "It really depends on how far into the backrooms they go, while most of the rooms won't be that expensive to build as sets per room the whole idea is that the backrooms are endless so in a feature length exploration you would likely see a lot of rooms. So I expect at least some of the rooms might be virtual (or at least utilizing a lot of virtual set extensions). Although they could also just do a bunch of on location shoots and just have location scouts finding enough empty office buildings and similar liminal spaces (would actually be funny if they semi crowd-source location scouting by looking for places the backrooms and similar liminal space communities have posted)",
            timestamp: "8h ago",
            likeCount: 34,
            replyCount: 2,
            replies: [
              {
                id: "b2-1-1-1",
                username: "Bellikron",
                displayName: "Bellikron",
                ...avatar("B", g("#2a2e3a,#1a1e28"), "#7a8ab8"),
                text: "Severance does a pretty good job creating this kind of setting with a blend of VFX and sets. Since the backgrounds are so nondescript it's pretty easy to fake them convincingly when you need to.",
                timestamp: "5h ago",
                likeCount: 18,
                replyCount: 1,
                replies: [
                  {
                    id: "b2-1-1-1-1",
                    username: "DARTH-PIG",
                    displayName: "DARTH-PIG",
                    ...avatar("D", g("#3a1a1a,#2a1212"), "#cc6a6a"),
                    text: "If they make it sort of modular that could help to save money while having a good variety of rooms.",
                    timestamp: "5h ago",
                    likeCount: 9,
                    replyCount: 2,
                    replies: [
                      {
                        id: "b2-1-1-1-1-1",
                        username: "Guildenpants",
                        displayName: "Guildenpants",
                        ...avatar("G", g("#1e2a2a,#1a2222"), "#6a9a9a"),
                        text: "They almost certainly will do it this way. Walls and ceilings that can break away and be moved around. Then volume or green screen rooms that have massive pitfalls or what have you",
                        timestamp: "4h ago",
                        likeCount: 6,
                        replyCount: 0,
                      },
                      {
                        id: "b2-1-1-1-1-2",
                        username: "Telvin3d",
                        displayName: "Telvin3d",
                        ...avatar("T", g("#2a1e2e,#1a121a"), "#9a6a9a"),
                        text: "If there's anything Hollywood is good at, it's redressing the same set in different configurations.",
                        timestamp: "4h ago",
                        likeCount: 11,
                        replyCount: 0,
                      },
                    ],
                  },
                ],
              },
              {
                id: "b2-1-1-2",
                username: "aerospacenut",
                displayName: "aerospacenut",
                ...avatar("A", g("#2e2a1a,#2a2618"), "#b8a86a"),
                text: "Apparently all but the last shot were rendered in blender interestingly enough but I imagine we'll get a lot of real sets given the 15 mil(?) budget",
                timestamp: "6h ago",
                likeCount: 2,
                replyCount: 2,
                replies: [
                  {
                    id: "b2-1-1-2-1",
                    username: "Ok_Temperature6503",
                    displayName: "Ok_Temperature6503",
                    ...avatar("O", g("#2a2e3a,#1a1e28"), "#8a9ccc"),
                    text: "I imagine a WHOLE lotta drywall.",
                    timestamp: "6h ago",
                    likeCount: 1,
                    replyCount: 0,
                  },
                  {
                    id: "b2-1-1-2-2",
                    username: "Turnbob73",
                    displayName: "Turnbob73",
                    ...avatar("T", g("#1e2a2e,#1a2226"), "#6a8a9a"),
                    text: "It is real sets, or at least some of it is; Kane has posted some pictures of the set before.",
                    timestamp: "4h ago",
                    likeCount: 7,
                    replyCount: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "b3",
    username: "RealJohnGillman",
    displayName: "RealJohnGillman",
    ...avatar("R", g("#2a1e1e,#1a1212"), "#b87a7a"),
    text: "I believe it will be a combination, as the director went for in later episodes of the web series: live-action outside the Backroom, animated inside.",
    timestamp: "9h ago",
    likeCount: 19,
    replyCount: 22,
  },
];

/** KatherineLanqford — Sinners second act (r/TrueFilm-style thread) */
export const MOCK_COMMENTS_SINNERS_TRUEFILM: Comment[] = [
  {
    id: "sf1",
    username: "Dangerous-Coach-1999",
    displayName: "Dangerous-Coach-1999",
    ...avatar("D", g("#4a3d1a,#2a2210"), "#d4c48a"),
    text:
      "The hand-holding drove me up the wall — the narration keeps restating what we're already seeing, and the flashbacks (the \"I lied to you\" beat, the cut to a child's grave in the middle of a death scene) feel like the film doesn't trust us to keep up.",
    timestamp: "1mo ago",
    likeCount: 869,
    replyCount: 2,
    replies: [
      {
        id: "sf1-1",
        username: "I_am_so_lost_hello",
        displayName: "I_am_so_lost_hello",
        ...avatar("I", g("#1e3a2e,#122018"), "#7accaa"),
        text:
          "Same — the flashbacks to the brothers buying property and the Klan set-up start to feel like checkpoints instead of drama. And the epilogue hammers the themes so explicitly it's like the film is afraid we'll miss the memo.",
        timestamp: "1mo ago",
        likeCount: 168,
        replyCount: 1,
        replies: [
          {
            id: "sf1-1-1",
            username: "vinnymendoza09",
            displayName: "vinnymendoza09",
            ...avatar("V", g("#2a2e4a,#15182a"), "#9aa6e8"),
            text:
              "So much of modern studio cinema feels calibrated for people half-watching their phones. The boardroom version of \"clarity\" is just endless explanation.",
            timestamp: "1mo ago",
            likeCount: 131,
            replyCount: 2,
            replies: [
              {
                id: "sf1-1-1-1",
                username: "TraceOfHumanity",
                displayName: "TraceOfHumanity",
                ...avatar("T", g("#1a2530,#0f1418"), "#7a9eb8"),
                text:
                  "Funny — scroll a little and you'll find people praising the exact same scenes as genius. Same film, totally different read on whether it's subtle or sledgehammer.",
                timestamp: "1mo ago",
                likeCount: 40,
                replyCount: 0,
              },
              {
                id: "sf1-1-1-2",
                username: "jamie_plays_his_bass",
                displayName: "jamie_plays_his_bass",
                ...avatar("J", g("#1e3a4a,#12222a"), "#6ab8d4"),
                text:
                  "There's another flashback after the KKK massacre — character trying to roll a smoke — that lands as pure filler. Felt like the edit was stalling for time.",
                timestamp: "28d ago",
                likeCount: 3,
                replyCount: 0,
              },
            ],
          },
        ],
      },
      {
        id: "sf1-2",
        username: "icyserene",
        displayName: "icyserene",
        ...avatar("I", g("#3a2e1a,#221a10"), "#d4b88a"),
        text:
          "I really wanted more from the church / sin / music / demons braid — especially Sammy's relationship with religion and his pastor father. The opening frames it like that will matter, then the KKK plot almost drops in from another movie. I don't think they ever figured out how to land all of it together.",
        timestamp: "1mo ago",
        likeCount: 303,
        replyCount: 1,
        replies: [
          {
            id: "sf1-2-1",
            username: "Buffaluffasaurus",
            displayName: "Buffaluffasaurus",
            ...avatar("B", g("#2e2e2e,#141414"), "#c8c8c8"),
            text:
              "The prologue sells music as a kind of veil between worlds and Sammy as someone with a gift — I genuinely thought we were heading toward a supernatural battle where sound is the weapon against the vampires. Instead the back half devolves into a sloppy siege and a bloody KKK pile-on that feels bolted on. The \"pass the garlic\" stretch even echoes The Thing, but without the paranoia that made that work. And the Chicago twins double-cross goes nowhere — there was a wilder, messier three-way ending in there (Sammy vs. vampires vs. a supercharged Klan) that might at least have paid off the music myth.",
            timestamp: "1mo ago",
            likeCount: 131,
            replyCount: 1,
            replies: [
              {
                id: "sf1-2-1-1",
                username: "This-Charming-Man",
                displayName: "This-Charming-Man",
                ...avatar("T", g("#1e2a4a,#121a30"), "#6a8ae8"),
                text:
                  "Yeah — the spiritual / musical theme is ladled on early and then mostly abandoned. Also the villain-with-everything-won 80s monologue beat: he's got the hero dead to rights and talks for five minutes instead of finishing it. Hard to avoid in the explain-everything era, I guess.",
                timestamp: "1mo ago",
                likeCount: 23,
                replyCount: 1,
                replies: [
                  {
                    id: "sf1-2-1-1-1",
                    username: "Electrical_Nobody196",
                    displayName: "Electrical_Nobody196",
                    ...avatar("E", g("#4a3a1a,#2a2210"), "#e8d48a"),
                    text:
                      "Do you mean when Remmick gives a sermon and baptizes Sammie right before turning him — and then the climax is Sammie striking him down with the instrument while lightning reads as divine backup?",
                    timestamp: "1mo ago",
                    likeCount: 41,
                    replyCount: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "sf2",
    username: "Old_Flan_6548",
    displayName: "Old_Flan_6548",
    ...avatar("O", g("#1a1a1a,#0d0d0d"), "#e0e0e0"),
    text:
      "YES. I felt exactly this way too. I like Coogler but he treats his audience like we're idiots.",
    timestamp: "1mo ago",
    likeCount: 228,
    replyCount: 0,
  },
  {
    id: "sf3",
    username: "RahMaarvi",
    displayName: "RahMaarvi",
    ...avatar("R", g("#4a2818,#2a1408"), "#f0a878"),
    text:
      "My only critique is Grace's decisions at the end. You want to save your daughter, so you invite the vampires in and put everyone at risk, throw a Molotov, then run into the flames without trying to smother them — now your daughter has lost both parents. Maybe we're meant to read it as grief overriding sense.",
    timestamp: "28d ago",
    likeCount: 12,
    replyCount: 0,
  },
  {
    id: "sf4",
    username: "DrHorrible10",
    displayName: "DrHorrible10",
    ...avatar("D", g("#3a1a2e,#1a0e18"), "#e88ac8"),
    text:
      "Copying from another thread: there are so many directions this premise could go that would raise the stakes. Instead a huge chunk of the second half is the same beat at the door — \"Are you a vampire?\" \"Nuh-uh.\" — until someone is told to invite them in. We already suspect the Klan is watching the joint; why not have them bust the door down, force everyone deeper inside, and make letting the vampires in a desperate chaos move against the KKK? Haven't stress-tested it against every theme, but it would have been a more propulsive second half.",
    timestamp: "1mo ago",
    likeCount: 27,
    replyCount: 1,
    replies: [
      {
        id: "sf4-1",
        username: "templarcole",
        displayName: "templarcole",
        ...avatar("T", g("#1a3a2a,#0e2218"), "#7ae8b4"),
        text:
          "There's a thematic read though: people who aren't Black can still have a real stake in the space while making Black culture easier for outsiders to exploit — a bit like opening a door that isn't fully yours to open. The vampires as metaphor kind of rhyme with that.",
        timestamp: "28d ago",
        likeCount: 5,
        replyCount: 0,
      },
    ],
  },
  {
    id: "sf5",
    username: "KnotSoSalty",
    displayName: "KnotSoSalty",
    ...avatar("K", g("#4a4a1a,#2a2a10"), "#e8e88a"),
    text:
      "Feels like they wrote themselves into a corner and needed the mother to do something huge and reckless to restart the action. The KKK finale also seems there mostly to give Smoke a \"win,\" but those guys haven't been the primary antagonist for the previous two hours, so it lands oddly.",
    timestamp: "1mo ago",
    likeCount: 84,
    replyCount: 1,
    replies: [
      {
        id: "sf5-1",
        username: "Codewill",
        displayName: "Codewill",
        ...avatar("C", g("#2a2a3a,#14141e"), "#b4b4e8"),
        text:
          "Agree the mother's choice is brutal to watch. I wish there were a more thematically tight way to get the vampires across the threshold. If it's tragedy and you know the place is doomed, how do you make that feel inevitable instead of convenient? On the KKK: I didn't find it as left-field — it's a bit like the original Get Out beat where escape collides with \"real\" violence. Hokey on paper, but it underscores that even without the monsters, the historical threat was always there. That reading ties the vampires, the racist couple, sharecropping, and the Klan into one suffocating stack.",
        timestamp: "1mo ago",
        likeCount: 17,
        replyCount: 1,
        replies: [
          {
            id: "sf5-1-1",
            username: "Foehammer87",
            displayName: "Foehammer87",
            ...avatar("F", g("#1a1410,#0d0a08"), "#c88848"),
            text:
              "The choice makes emotional sense to her in the moment — just not in any long-term strategic sense.",
            timestamp: "1mo ago",
            likeCount: 9,
            replyCount: 0,
          },
        ],
      },
    ],
  },
];

/** Louisebelcher22 — female directors / The Bride! discourse (r/TrueFilm-style thread) */
export const MOCK_COMMENTS_FEMALE_DIRECTORS_VENOM: Comment[] = [
  {
    id: "fd1",
    username: "alpine5882",
    displayName: "alpine5882",
    ...avatar("A", g("#3a4a2a,#1e2a14"), "#b8e89a"),
    text:
      "Cause some people don't like women. Same typical thing of \"woah this man went method and did all these horrible, annoying, unprofessional things how cool and admirable, he's so dedicated\". But then a woman is often labelled a diva and difficult to work with and blacklisted if she establishes boundaries and pushes against casual, or ridiculous sexism or even just is vocal about things she's unhappy with. Eg. Katherine Heigl",
    timestamp: "1d ago",
    likeCount: 349,
    replyCount: 3,
    replies: [
      {
        id: "fd1-1",
        username: "PlayPretend-8675309",
        displayName: "PlayPretend-8675309",
        ...avatar("P", g("#3a2a4a,#1e1428"), "#c4a8e8"),
        text:
          "This is so funny because Method is absolutely a criticism and the \"he's so dedicated\" narrative stone cold hasn't existed for a quarter-century.",
        timestamp: "1d ago",
        likeCount: -5,
        replyCount: 0,
      },
      {
        id: "fd1-2",
        username: "deleted",
        displayName: "[deleted]",
        ...avatar("?", g("#2a2a2a,#141414"), "#737373"),
        text: "Comment unavailable.",
        timestamp: "1d ago",
        likeCount: 1,
        replyCount: 0,
      },
      {
        id: "fd1-3",
        username: "MKEMARVEL",
        displayName: "MKEMARVEL",
        ...avatar("M", g("#4a2a1a,#2a1408"), "#f0a070"),
        text:
          "What? Most extreme method actors get mocked constantly. \"My dear boy, have you tried acting?\"",
        timestamp: "1d ago",
        likeCount: -46,
        replyCount: 1,
        replies: [
          {
            id: "fd1-3-1",
            username: "alpine5882",
            displayName: "alpine5882",
            ...avatar("A", g("#3a4a2a,#1e2a14"), "#b8e89a"),
            text:
              "Yes they do get the piss taken out of them, I'm not saying everyone loves method acting. Sorry, next time I'll clarify I'm not talking about every single person ever",
            timestamp: "1d ago",
            likeCount: 54,
            replyCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "fd2",
    username: "ToneBalone25",
    displayName: "ToneBalone25",
    ...avatar("T", g("#4a3018,#261808"), "#f0b878"),
    text:
      "Sexism. You ever notice that every time a woman shares an opinion they get piled on? Look what happened to Rachel Zegler. Not even a controversial person, by any means, yet she gets loads of hate on social media.",
    timestamp: "1d ago",
    likeCount: 146,
    replyCount: 1,
    replies: [
      {
        id: "fd2-1",
        username: "RebelKiddo",
        displayName: "RebelKiddo",
        ...avatar("R", g("#5a1a1a,#2a0c0c"), "#f08888"),
        text:
          "People targeting women be it actresses or singers has been around since the dawn of the paparazzi and the tabloid. Especially if they're opinionated or brash or outspoken, Rachel Zegler is not at all controversial, she's absolutely beautiful and a wonderful singer. But women like her who speak their minds are labeled as \"difficult to work with\", my favorite actress Megan Fox got hit with this hate mob back in 2008-9 because she dared to be opinionated and call out BS in pre Me-Too Hollywood.\n\nEdit: Damn didn't know I had poor taste.",
        timestamp: "1d ago · Edited 1d ago",
        likeCount: 22,
        replyCount: 1,
        replies: [
          {
            id: "fd2-1-1",
            username: "DharmaPolice",
            displayName: "DharmaPolice",
            ...avatar("D", g("#2a3a4a,#141c28"), "#88b8e8"),
            text:
              "\"Damn didn't know I had poor taste.\"\n\nGiven the comment about Megan Fox I honestly can't tell if this is a joke.",
            timestamp: "1d ago",
            likeCount: -7,
            replyCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "fd3",
    username: "Electric-Sheepskin",
    displayName: "Electric-Sheepskin",
    ...avatar("E", g("#2a1a3a,#140e20"), "#c8a8e8"),
    text:
      "First time on the Internet? People love to tear down women. Famous men can get away with literally raping young girls, inducting people into cults, and being all around horrible human beings, but God forbid if a woman ages badly or said something mean to someone that one time. OK that's a slight exaggeration, but it's true that women are judged way more harshly than men. It always has been.",
    timestamp: "1d ago",
    likeCount: 108,
    replyCount: 1,
    replies: [
      {
        id: "fd3-1",
        username: "s_nation",
        displayName: "s_nation",
        ...avatar("S", g("#1a3a2a,#0e2218"), "#88e8c8"),
        text:
          "no exaggeration. see roman polanski and if we're extending this to celebs in general: mike tyson, sean penn, chris brown, jack nicholson, richard pryor, assault, battery, rape...they pretty much got away with it no cancellations for them\n\nwomen are cancelled for way more minor things that aren't even criminal\n\n\"but her emails\"\n\n\"but her laugh\"\n\nconstant \"but... but... but... but\"\n\nsuperficial heuristics often mask misogyny",
        timestamp: "11h ago · Edited 11h ago",
        likeCount: 15,
        replyCount: 0,
      },
    ],
  },
  {
    id: "fd4",
    username: "IdRatherBeOnBGG",
    displayName: "IdRatherBeOnBGG",
    ...avatar("I", g("#4a3a1a,#2a2210"), "#e8d090"),
    text:
      "In my opinion, there are exactly two causes of this, which go hand in hand:\n\n• Just straight-up misogyny. Prevalent in society at large, and even more prevalent online, and in the more conservative media outlets.\n\n• A lot of film criticism these days is, to be perfectly blunt, utter shit. The job of most \"film critics\" today is basically: \"mention movie, have provocative take that fits our demographics preconceived notions, and/or pile on whatever hype- or dump-train is going right now\".\n\nI've not checked this example, but I'm pretty sure if you follow the coverage of some random female filmmaker, like Gyllenhaal, by some actual, honest-to-god film critics like Mark Kermode, you will see her get a fair shake.\n\nBut that is not the same as the impression you get from Facebook, Google, Rotten Tomatoes, Metacritic, etc.!",
    timestamp: "22h ago",
    likeCount: 27,
    replyCount: 0,
  },
  {
    id: "fd5",
    username: "ozplissken",
    displayName: "ozplissken",
    ...avatar("O", g("#4a1a3a,#260e20"), "#f088c8"),
    text:
      "Yup, very true sadly. Guy Ritchie has made at least 10 shit films after Snatch and no matter how bad the films are, go on any Reddit thread and people constantly defend him with the \"I didn't think Operation Fortune was that bad, I kinda liked Wrath Of Man, RocknRolla doesn't pretend to be a masterpiece, The Ministry of Ungentlemanly Warfare doesn't take itself seriously, I actually really enjoyed King Arthur\" it goes on and on, enough.\n\nElaine May makes one flop (Ishtar) and gets cancelled on the spot for 40 years straight and counting, no second chance sweetheart, we're full. She made A New Leaf, The Heartbreak Kid & Mikey and Nicky for crying out loud.\n\nRevolver was over 20 years ago, Swept Away nearly 25 but he still gets to direct and no one is ever harsh on him, he gets treated like the drunk uncle, with just a shrug and an eye roll.\n\nAnd don't even get me started on Eli Roth.",
    timestamp: "15h ago · Edited 3h ago",
    likeCount: 13,
    replyCount: 0,
  },
];

/** Project Hail Mary casting / “normal looking actors” thread */
export const MOCK_COMMENTS_PROJECT_HAIL_MARY: Comment[] = [
  {
    id: "ph1",
    username: "Commander-Catnip",
    displayName: "Commander-Catnip",
    ...avatar("C", g("#3a2e1a,#221a0e"), "#e8c48a"),
    text:
      "I really noticed this in Alien: Romulus, which I mostly enjoyed, but the whole cast look like models and are meant to be a group of industrial miners. Compare the cast of A:R with the original '79 movie, that looks like the crew of a deep space salvage crew.",
    timestamp: "5d ago",
    likeCount: 1200,
    replyCount: 2,
    replies: [
      {
        id: "ph1-1",
        username: "Debisibusis",
        displayName: "Debisibusis",
        ...avatar("D", g("#2a3a4a,#141c28"), "#88b8e8"),
        text:
          "Absolutely, that was the worst part of the movie imo. A planet without sun for 10 years, more or less a slavery mining operation. But they all look straight out of the California Disney Club. Another good example is the lowest of the low slum rats from Alita: https://i.imgur.com/hXB9Drf.jpeg",
        timestamp: "5d ago",
        likeCount: 321,
        replyCount: 1,
        replies: [
          {
            id: "ph1-1-1",
            username: "sibelius_eighth",
            displayName: "sibelius_eighth",
            ...avatar("S", g("#3a1a2a,#1a0e14"), "#e888a8"),
            text:
              "The worst part of the movie was the constant throwbacks to better films. Get away from her you bitch. Why is the android saying that?",
            timestamp: "5d ago",
            likeCount: 120,
            replyCount: 2,
            replies: [
              {
                id: "ph1-1-1-1",
                username: "DiscernibleInf",
                displayName: "DiscernibleInf",
                ...avatar("D", g("#1e2a1e,#121a12"), "#8acc8a"),
                text:
                  "The worst thing about that was the delivery.\n\nget away from her\n\n*sips coffee*\n\nyou bitch",
                timestamp: "4d ago",
                likeCount: 17,
                replyCount: 0,
              },
              {
                id: "ph1-1-1-2",
                username: "invertedpurple",
                displayName: "invertedpurple",
                ...avatar("I", g("#2e1a3a,#180e22"), "#c8a0e8"),
                text: "because Disney needs constant logic breaking nostalgia",
                timestamp: "4d ago",
                likeCount: 40,
                replyCount: 0,
              },
            ],
          },
        ],
      },
      {
        id: "ph1-2",
        username: "Disastrous-Angle-591",
        displayName: "Disastrous-Angle-591",
        ...avatar("D", g("#4a2a1a,#2a1408"), "#f0a070"),
        text:
          "roger ebert (RIP) had a great quote about this re: Starship Troopers.. Something \"all the characters appear to have just stepped off the set of a toothpaste commercial\"",
        timestamp: "4d ago",
        likeCount: 18,
        replyCount: 1,
        replies: [
          {
            id: "ph1-2-1",
            username: "Yeshavesome420",
            displayName: "Yeshavesome420",
            ...avatar("Y", g("#2a2a1a,#141408"), "#d8d888"),
            text: "In that instance it was intentional.",
            timestamp: "4d ago",
            likeCount: 19,
            replyCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "ph2",
    username: "reviewofboox",
    displayName: "reviewofboox",
    ...avatar("R", g("#3a2a4a,#1e1828"), "#b8a8e8"),
    text:
      "It's not just you. I love watching old shows with actors like Peter Falk or Shelley Duvall, or just 'normal pretty' people. I find a lot of things unwatchable now due to the combination of generic features (baseline) and surgery, injectables, and false teeth (bonuses).",
    timestamp: "5d ago",
    likeCount: 515,
    replyCount: 1,
    replies: [
      {
        id: "ph2-1",
        username: "2980774",
        displayName: "2980774",
        ...avatar("2", g("#4a4a1a,#2a2a0c"), "#e8e8a0"),
        text: "How dare you imply Peter Falk wasn't the hottest man on tv",
        timestamp: "5d ago",
        likeCount: 133,
        replyCount: 1,
        replies: [
          {
            id: "ph2-1-1",
            username: "reviewofboox",
            displayName: "reviewofboox",
            ...avatar("R", g("#3a2a4a,#1e1828"), "#b8a8e8"),
            text: "He was hot in a real way!",
            timestamp: "5d ago",
            likeCount: 35,
            replyCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "ph3",
    username: "detourne",
    displayName: "detourne",
    ...avatar("D", g("#4a3010,#261808"), "#f0a860"),
    text:
      "Danny McBride in Covenant may be less conventionally attractive than anyone in the first movie, though.",
    timestamp: "5d ago",
    likeCount: 82,
    replyCount: 5,
    replies: [
      {
        id: "ph3-1",
        username: "rhdkcnrj",
        displayName: "rhdkcnrj",
        ...avatar("R", g("#1a3a3a,#0e2222"), "#88e0e0"),
        text: "Danny McBride catching a massive stray out here",
        timestamp: "5d ago",
        likeCount: 150,
        replyCount: 2,
        replies: [
          {
            id: "ph3-1-1",
            username: "pqln",
            displayName: "pqln",
            ...avatar("P", g("#3a1a3a,#1a0e1e"), "#e090d0"),
            text: "He knows how he looks; he chose this life when he chose that mustache",
            timestamp: "5d ago",
            likeCount: 100,
            replyCount: 0,
          },
          {
            id: "ph3-1-2",
            username: "sudosussudio",
            displayName: "sudosussudio",
            ...avatar("S", g("#4a2a3a,#261828"), "#e0a0d0"),
            text:
              "I find him extremely attractive though Walton Goggins is the most attractive in that scene imho. I love character actors.",
            timestamp: "5d ago",
            likeCount: 28,
            replyCount: 0,
          },
        ],
      },
      {
        id: "ph3-2",
        username: "may25_1996",
        displayName: "may25_1996",
        ...avatar("M", g("#2a2a2a,#141414"), "#c0c0c0"),
        text: "say what you want, he can take danger.",
        timestamp: "5d ago",
        likeCount: 9,
        replyCount: 0,
      },
      {
        id: "ph3-3",
        username: "Chasedabigbase",
        displayName: "Chasedabigbase",
        ...avatar("C", g("#2e1a4a,#180e28"), "#b090e8"),
        text: "They looked like that one tiktok girl larping as a Walmart employee",
        timestamp: "4d ago",
        likeCount: 10,
        replyCount: 0,
      },
      {
        id: "ph3-4",
        username: "Common_Upstairs_1710",
        displayName: "Common_Upstairs_1710",
        ...avatar("C", g("#4a1a1a,#280808"), "#f08888"),
        text:
          "Absolutely right about Alien Romulus. As soon as the film finished my friend said to me 'why did the crew look like One Direction?'",
        timestamp: "3d ago",
        likeCount: 7,
        replyCount: 0,
      },
    ],
  },
];

/** Comments keyed by post id. Use for post detail pages. */
export const MOCK_COMMENTS_BY_POST_ID: Record<string, Comment[]> = {
  "6": MOCK_COMMENTS_BACKROOMS,
  "sinners-truefilm": MOCK_COMMENTS_SINNERS_TRUEFILM,
  "female-directors-venom": MOCK_COMMENTS_FEMALE_DIRECTORS_VENOM,
  "project-hail-mary-casting": MOCK_COMMENTS_PROJECT_HAIL_MARY,
};

/** Comments for selected high-engagement Tamil & Telugu posts */
export const MOCK_COMMENTS_TAMIL_TELUGU: Record<string, Comment[]> = {
  "69": [
    {
      id: "t1",
      username: "shithitdfan",
      displayName: "KutteyKaminey",
      ...avatar("K", g("#3a2d4a,#2a1a3a"), "#b08fcc"),
      text: "I wouldnt disagree but i will add 2 more to this list 35- neeli meghamulaloo C/o kancharlapalem - asha pasham",
      timestamp: "5h ago",
      likeCount: 49,
      replyCount: 2,
    },
    {
      id: "t2",
      username: "SatishC106",
      displayName: "Aswadhamaaa..!",
      ...avatar("A", g("#2a3a4a,#1a2530"), "#7a9eb8"),
      text: "Everyone may comment on venkatesh maha for his opinions, but he lives up to what he say. His movies handles emotion, drama, art very well",
      timestamp: "6h ago",
      likeCount: 20,
      replyCount: 0,
    },
  ],
  "71": [
    {
      id: "t3",
      username: "DReyes_India",
      displayName: "Dante Reyes",
      ...avatar("D", g("#3a3a2a,#2a2a1a"), "#c4c46a"),
      text: "These kind of looks are given to gangsters and billionaires by foreign girls. even in Hollywood ra south Bihari golti. Whats cringe is when those old guys have duet song in Europe with those girls while showing navel fetish.",
      timestamp: "4h ago",
      likeCount: 183,
      replyCount: 7,
    },
    {
      id: "t4",
      username: "exsrin",
      displayName: "︎ ︎ ︎",
      ...avatar("E", g("#2e2a1a,#2a2618"), "#b8b06a"),
      text: "Meanwhile our mobbot with 22 year old aged girl",
      timestamp: "3h ago",
      likeCount: 145,
      replyCount: 6,
    },
  ],
  "76": [
    {
      id: "t7",
      username: "MytweetsMywishh",
      displayName: "smile",
      ...avatar("M", g("#1e3a2a,#1a2a22"), "#7acc9a"),
      text: "https://t.co/TA2l7mCU1q",
      timestamp: "2mo ago",
      likeCount: 195,
      replyCount: 9,
    },
    {
      id: "t8",
      username: "Sir_Kuruvi",
      displayName: "Kuruvi",
      ...avatar("K", g("#2a2e3a,#1a1e2a"), "#8a9ccc"),
      text: "Manifesting Allu Arjun stardom in Kollywood. Bring it up Atlee & Loki",
      timestamp: "2mo ago",
      likeCount: 73,
      replyCount: 1,
    },
  ],
};

export function getCommentsForPost(postId: string): Comment[] | undefined {
  return MOCK_COMMENTS_TAMIL_TELUGU[postId] || MOCK_COMMENTS_BY_POST_ID[postId];
}
