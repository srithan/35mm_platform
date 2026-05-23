export interface FestivalListItem {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  location: string;
  country: string;
  yearsRunning: number;
  badges?: ("academy-award" | "bafta" | "top-100" | "best-reviewed" | "new" | "fiapf-accredited")[];
  nextDeadline?: string;
  finalDeadline?: string;
  eventDate?: string;
  entryFeeFrom?: number;
  categories: string[];
  eventType:
    | "film-festival"
    | "screenwriting"
    | "music"
    | "photography"
    | "online"
    | "event"
    | "awards-ceremony"
    | "conference-festival"
    | "festival-market";
  isOpen: boolean;
  pagePicture: string;
  coverPicture: string;
}

export interface FestivalDetail extends FestivalListItem {
  about: string;
  whySubmit?: string[];
  venue?: { name: string; address: string; city: string; country: string };
  contact?: { email?: string; website?: string; facebook?: string; instagram?: string; x?: string };
  datesAndDeadlines: Array<{ label: string; date: string }>;
  categoriesAndFees: Array<{
    category: string;
    addOn?: string;
    fees: Array<{ deadline: string; standard: number; student?: number; gold?: number }>;
  }>;
  awards?: string[];
  rulesExcerpt?: string;
  /** Full rules and regulations for the Rules tab */
  rules?: string;
  reviewCount?: number;
  rating?: number;
  photoCount?: number;
  photos?: string[];
}

/** Default festival gallery photos (used when a festival has no photos) */
export const DEFAULT_FESTIVAL_PHOTOS = [
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/002/942/781/thumb/eisenburg_composit2013_slide_show.jpg?1493318529",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/198/thumb/dana.jpg?1548888386",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/168/275/thumb/Jackie.jpg?1510599142",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/800/655/thumb/marquee.jpg?1549944505",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/247/336/thumb/more.jpg?1516901219",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/247/339/thumb/party.jpg?1516901258",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/213/thumb/talking.jpg?1548888863",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/211/thumb/sr.jpg?1548888830",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/247/274/thumb/26904655_10211204334491307_2775223938654092165_n.jpg?1516898877",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/210/thumb/dana.jpg?1548888810",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/202/thumb/crowd.jpg?1548888392",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/168/272/thumb/bean.jpg?1510599092",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/168/277/thumb/nice.jpg?1510599175",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/247/335/thumb/enhance_3.jpg?1516901209",
  "https://filmfreeway-production-storage-01-connector.filmfreeway.com/attachments/files/003/776/200/thumb/sr.jpg?1548888386",
];

function coverFromPage(page: string, name = "Cover"): string {
  if (page.includes("dummyimage.com")) {
    return page.replace(/\/\d+x\d+\//, "/1200x400/").replace(/&text=([^&]+)/, `&text=$1+${name}`);
  }
  return page;
}

function ensureDates(
  f: { nextDeadline?: string; finalDeadline?: string; eventDate?: string },
  existing?: Array<{ label: string; date: string }>
): Array<{ label: string; date: string }> {
  if (existing && existing.length > 0) return existing;
  const out: Array<{ label: string; date: string }> = [];
  if (f.nextDeadline) out.push({ label: "Next Deadline", date: f.nextDeadline });
  if (f.finalDeadline) out.push({ label: "Final Deadline", date: f.finalDeadline });
  if (f.eventDate) out.push({ label: "Event Date", date: f.eventDate });
  return out.length ? out : [{ label: "TBA", date: "See website" }];
}

/** Austin Film Festival–style category definitions with descriptions */
const CATEGORY_DEFINITIONS: Array<{ category: string; addOn: string }> = [
  {
    category: "Feature Film",
    addOn:
      "Any narrative work of fiction with a running time of 41 minutes or more, including films shot in a mockumentary style. The submitted project must be either scripted or improvisational fiction.",
  },
  {
    category: "Short Narrative Film",
    addOn:
      "Any narrative work of fiction with a running time of 40 minutes or less. Includes scripted and improvisational fiction of any style or genre.",
  },
  {
    category: "Documentary Short",
    addOn:
      "Non-fiction films of 40 minutes or less. Documentaries that explore real subjects, people, and events.",
  },
  {
    category: "Documentary Feature",
    addOn:
      "Non-fiction films with a running time of 41 minutes or more. In-depth explorations of real subjects, people, and events.",
  },
  {
    category: "Animated",
    addOn:
      "Animated works of any length. Includes traditional, stop-motion, CGI, and mixed-media animation.",
  },
  {
    category: "Children's/Family",
    addOn:
      "Films suitable for young audiences and families. Content should be appropriate for children while appealing to broader family viewing.",
  },
  {
    category: "Screenplay Competition",
    addOn:
      "Feature-length screenplays (typically 60–150 pages) or short scripts. Must be original, unproduced work.",
  },
  {
    category: "LGBTQ",
    addOn:
      "Films that explore LGBTQ+ themes, characters, and stories. All genres and lengths accepted.",
  },
  {
    category: "Sci-Fi & Fantasy",
    addOn:
      "Science fiction and fantasy films of any length. Includes speculative fiction, supernatural, and genre-bending work.",
  },
  {
    category: "Horror",
    addOn:
      "Horror and thrillers of any length. From psychological suspense to creature features.",
  },
  {
    category: "Jewish",
    addOn:
      "Films that explore Jewish culture, heritage, history, or themes. All genres and lengths accepted.",
  },
  {
    category: "African-American",
    addOn:
      "Films by or about African-American experiences, culture, and stories. All genres and lengths accepted.",
  },
  {
    category: "Indigenous",
    addOn:
      "Films by Indigenous filmmakers or exploring Indigenous stories, culture, and perspectives. All genres and lengths accepted.",
  },
  {
    category: "Canadian",
    addOn:
      "Films with significant Canadian content, talent, or themes. May require Canadian eligibility criteria.",
  },
  {
    category: "French-speaking",
    addOn:
      "Films in French or from French-speaking regions. All genres and lengths accepted.",
  },
  {
    category: "Japanese",
    addOn:
      "Films from Japan or exploring Japanese culture and stories. All genres and lengths accepted.",
  },
  {
    category: "Chinese",
    addOn:
      "Films from China or Chinese diaspora, or exploring Chinese culture. All genres and lengths accepted.",
  },
  {
    category: "Video Games",
    addOn:
      "Interactive narrative, game-related content, or documentaries about video games and game culture.",
  },
  {
    category: "High School",
    addOn:
      "Films made by high school students. Proof of enrollment may be required for student rates.",
  },
  {
    category: "College",
    addOn:
      "Films made by college or university students. Proof of enrollment may be required for student rates.",
  },
  {
    category: "Music Videos",
    addOn:
      "Music videos of any length. Typically under 10 minutes. Must have clear music rights.",
  },
  {
    category: "New England",
    addOn:
      "Films with ties to New England: made in the region, by regional filmmakers, or about the area.",
  },
  {
    category: "Webisodes",
    addOn:
      "Episodic content designed for web or streaming. Individual episodes or full series pilots.",
  },
  {
    category: "TV/Cable/Internet Pilot",
    addOn:
      "Pilot episodes for television, cable, or streaming series. Typically 30–90 minutes.",
  },
  {
    category: "Experimental Film",
    addOn:
      "Avant-garde, experimental, and non-narrative work. Pushes boundaries of form and storytelling.",
  },
  {
    category: "COVID-19 - Healthcare",
    addOn:
      "Films exploring the pandemic, healthcare workers, public health, or related themes.",
  },
  {
    category: "Podcasts",
    addOn:
      "Audio storytelling: narrative podcasts, documentary series, or fiction audio drama.",
  },
  {
    category: "AI Generated",
    addOn:
      "Films or content created with significant use of AI tools. Must disclose AI usage in submission.",
  },
];

function buildCategoriesAndFees(
  f: {
    datesAndDeadlines: Array<{ label: string; date: string }>;
    entryFeeFrom?: number;
    nextDeadline?: string;
    finalDeadline?: string;
  }
): FestivalDetail["categoriesAndFees"] {
  const base = f.entryFeeFrom ?? 50;
  const dates = f.datesAndDeadlines ?? [];
  const deadlineLabels =
    dates.length >= 4
      ? dates.slice(0, 4).map((d) => d.label)
      : dates.length >= 3
        ? [dates[0]?.label ?? "Earlybird", dates[1]?.label ?? "Regular", dates[2]?.label ?? "Late"]
        : dates.length >= 2
          ? [dates[0]?.label ?? "Early", dates[1]?.label ?? "Final"]
          : dates.length === 1
            ? [dates[0]?.label ?? "Standard"]
            : ["See listing"];
  const deadlineDates =
    dates.length >= 4
      ? dates.slice(0, 4).map((d) => d.date)
      : dates.length >= 3
        ? [dates[0]?.date ?? "TBA", dates[1]?.date ?? "TBA", dates[2]?.date ?? "TBA"]
        : dates.length >= 2
          ? [dates[0]?.date ?? "TBA", dates[1]?.date ?? "TBA"]
          : dates.length === 1
            ? [dates[0]?.date ?? "TBA"]
            : ["See website"];

  const scales = [1, 1.3, 1.5, 1.7]; // Earlybird, Regular, Late, Extended
  return CATEGORY_DEFINITIONS.map((def) => {
    const fees = deadlineLabels.map((label, i) => {
      const scale = scales[Math.min(i, scales.length - 1)] ?? 1;
      const standard = base === 0 ? 0 : Math.round(base * scale);
      const student = base === 0 ? 0 : Math.round(standard * 0.7);
      const gold = base === 0 ? 0 : Math.round(standard * 0.85);
      return {
        deadline: `${label}: ${deadlineDates[i] ?? "TBA"}`,
        standard,
        student,
        gold,
      };
    });
    return { ...def, fees };
  });
}

function ensureCategoriesAndFees(
  f: { entryFeeFrom?: number },
  dates: Array<{ label: string; date: string }>
): FestivalDetail["categoriesAndFees"] {
  return buildCategoriesAndFees({
    datesAndDeadlines: dates,
    entryFeeFrom: f.entryFeeFrom,
  });
}

type FestivalInput = Omit<FestivalDetail, "coverPicture" | "datesAndDeadlines" | "categoriesAndFees"> & {
  coverPicture?: string;
  datesAndDeadlines?: Array<{ label: string; date: string }>;
  categoriesAndFees?: FestivalDetail["categoriesAndFees"];
};

function ensurePhotos(existing?: string[]): string[] {
  if (existing && existing.length > 0) return existing;
  return DEFAULT_FESTIVAL_PHOTOS;
}

function toFestival(f: FestivalInput): FestivalDetail {
  const cover = f.coverPicture ?? coverFromPage(f.pagePicture);
  const dates = ensureDates(f, f.datesAndDeadlines);
  const cats = ensureCategoriesAndFees(f, dates);
  const photos = ensurePhotos(f.photos);
  return {
    ...f,
    coverPicture: cover,
    datesAndDeadlines: dates,
    categoriesAndFees: cats,
    photos,
    photoCount: f.photoCount ?? photos.length,
  };
}

/** Generate template rules for festivals (variants of the standard rules). */
function rulesTemplate(
  name: string,
  abbrev: string,
  opts?: { filmCompletionDate?: string; screenplayPages?: string }
): string {
  const completed = opts?.filmCompletionDate ?? "January 1, 2024";
  const pages = opts?.screenplayPages ?? "60–150 pages for features, under 60 for shorts";
  return `FILM SUBMISSION RULES AND REGULATIONS:

1. ${name} accepts submissions for feature films, short films, feature documentaries, short documentaries, animation, episodic content, music videos, and student films.

2. All films submitted must have been completed on or after ${completed}.

3. All films must be submitted with an online screener.

4. All feature narrative and feature documentary submissions must be over 60 minutes in length.

5. All short film narrative and short documentary submissions must be under 60 minutes in length.

6. Animation, episodic, and student film submissions of all lengths will be considered.

7. Music videos must be under 10 minutes.

8. ${abbrev} will present selected films at a live in-person event.

9. Submission fees are non-refundable.

10. SUBMITTER MUST HOLD ALL NECESSARY RIGHTS AND CLEARANCES TO ALL MATERIAL SUBMITTED.

11. The organizers wish to make it clear that while we welcome all submissions, we are unable to provide individualized feedback. The selection process is subjective and may involve various programming considerations. ${abbrev} is under no obligation to provide feedback or explain why a particular film was not selected. Our decisions are final.

12. ${name} reserves the right to withdraw any project from the festival program at any time for any reason.

13. The identities and contact information of screeners shall remain strictly confidential.

14. All information provided may be subject to change, including event dates, venue, awards, and programming.

15. DISCLAIMER: By submitting to ${name} ("${abbrev}"), you agree to release and hold harmless ${abbrev}, its affiliates, staff, and partners from any claims or damages arising from your submission or participation. ${abbrev} is not responsible for loss, damage, or unauthorized use of submitted materials.

16. Submitter confirms that they have read all rules and regulations prior to submitting.


SCREENPLAY RULES (where applicable):

1. Feature scripts must be ${pages}.

2. Submitted screenplays cannot have been optioned, purchased, or produced at the time of submission.

3. All entries must be submitted in English. Screenplays must be in PDF or Word format.

4. Submission fees are non-refundable.

5. Visit the festival website for complete rules and regulations.`;
}

const FESTIVALS_RAW: FestivalInput[] = [
  // Big Apple (legacy full-detail)
  {
    id: "big-apple-film-festival",
    slug: "big-apple-film-festival",
    name: "Big Apple Film Festival and Screenplay Competition",
    tagline: "Celebrating 23 Years of Independent Film in the Heart of New York City",
    location: "New York, New York",
    country: "United States",
    yearsRunning: 22,
    badges: ["top-100", "best-reviewed"],
    nextDeadline: "February 24, 2026",
    finalDeadline: "April 7, 2026",
    eventDate: "May 11 – 14, 2026",
    entryFeeFrom: 50,
    categories: ["Narrative Feature", "Short", "Documentary", "Animation", "Screenplay"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
    coverPicture: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80",
    about:
      "Big Apple Film Festival (BAFF) is a long-running NYC-based festival dedicated to showcasing innovative films and discovering bold new voices in screenwriting.",
    whySubmit: [
      "Live NYC Theatrical Screenings with filmmaker Q&As",
      "Ranked in the Top 1% of over 14,000 festivals on FilmFreeway",
      "Year-Round Virtual Networking and Mentorship",
    ],
    venue: { name: "Village East by Angelika", address: "181-189 2nd Avenue", city: "New York, New York 10003", country: "United States" },
    contact: { email: "info@bigapplefilmfestival.com", website: "https://bigapplefilmfestival.com", instagram: "bigapplefilmfest" },
    datesAndDeadlines: [
      { label: "BAFF Early Deadline", date: "February 24, 2026" },
      { label: "FINAL ENTRY DEADLINE", date: "April 7, 2026" },
      { label: "Event Date", date: "May 11 – 14, 2026" },
    ],
    categoriesAndFees: [
      { category: "Narrative Short Films", fees: [{ deadline: "FINAL ENTRY", standard: 85, gold: 76 }] },
      { category: "Feature Screenplay", fees: [{ deadline: "FINAL ENTRY", standard: 110, gold: 99 }] },
    ],
    awards: ["Best Feature Film", "Best Short Film", "Best Feature Documentary", "Best Animation"],
    rulesExcerpt: "All films submitted must have been completed on or after January 1, 2023.",
    rules: `FILM SUBMISSION RULES AND REGULATIONS:

1. Big Apple Film Festival accepts submissions for feature films, short films, feature documentaries, short documentaries, animation, episodic, music videos, student films, feature length screenplays, series/episodic pilot scripts and short screenplays.

2. All films submitted must have been completed on or after January 1, 2023.

3. All films must be submitted with an online screener.

4. All feature narrative and feature documentary submissions must be over 60 minutes in length.

5. All short film narrative and short documentary submissions must be under 60 minutes in length.

6. Animation, episodic, and student film submissions of all lengths will be considered.

7. Music Videos must be under 10 minutes.

8. BAFF will present selected films as a live in person event.

9. Submission fees are non-refundable.

10. SUBMITTER MUST HOLD ALL NECESSARY RIGHTS AND CLEARANCES TO ALL MATERIAL SUBMITTED TO BIG APPLE FILM FESTIVAL, LLC.

11. The organizers of the Big Apple Film Festival and Screenplay Competition wish to make it clear that while we welcome and appreciate all submissions to our festival, we are unable to provide individualized feedback on entries. Furthermore, the selection process for our festival is subjective and may involve various factors related to overall programming considerations. BAFF is under no obligation to provide feedback or comments regarding submitted films or scripts to any applicant. As such, Big Apple Film Festival is not obligated to explain why a particular film or script was not selected for inclusion in the festival, or why a particular script did not advance in our screenplay competition. Our decisions are final and not open to negotiation or appeal.

12. Big Apple Film Festival reserves the right to withdraw any project from our festival program or entry pool at any time for any reason we deem necessary.

13. Entrants hereby acknowledge and agree that the identities, business affiliations, and contact information of film screeners and script readers shall remain strictly confidential and will not be disclosed under any circumstances to the submitter.

14. All submitters who register for a prepaid All-Access Pass to the Agents, Managers & Producers Pitch Forum at the time of entry will automatically receive their pass in the spring of 2026, regardless of whether or not their project is selected for inclusion in the festival.

15. All information provided on this page may be subject to change. This includes but is not limited to: event dates, event details, industry conferences, networking events, event format, guest speakers, jurors, awards, venue, etc.

16. All selected films will be screened on DCP. All selected films must either provide a DCP, or have a DCP created. DCP's may be created through our partner organization, SimpleDCP. All selected films must be delivered by the deadline stated in the official selection notice. Films that are not delivered by the final delivery deadline will not be permitted to screen.

17. Submitter confirms that they have read all rules and regulations prior to submitting their project.

18. DISCLAIMER: By submitting to the Big Apple Film Festival and Screenplay Competition ("BAFF"), you agree to release and hold harmless BAFF, its affiliates, staff, and partners from any and all claims, liabilities, or damages arising from your submission or participation. BAFF is not responsible for loss, damage, or unauthorized use of submitted materials.

19. At Big Apple Film Festival and Screenplay Competition, the integrity of our evaluation process and the protection of your intellectual property are our highest priorities. We require all of our screeners and readers to sign an agreement that explicitly mandates that every submission receive a thorough evaluation conducted solely by a human. The use of any generative AI tool in the review, analysis, or feedback process is strictly prohibited under this contract. We reserve the right to audit feedback to uphold this standard and maintain the commitment outlined in our agreement with them. Our Agreement also includes a strict Confidentiality and Non-Disclosure Clause. Screeners and Readers are contractually obligated to not share, distribute, or discuss any copyrighted material or intellectual property they review outside of the secured film festival and screenplay competition platform and judging process. This agreement also states that all materials provided to the screeners and readers must be thoroughly deleted upon completion of review.

By submitting to the Big Apple Film Festival and Screenplay Competition, you can trust that we have taken robust, contractual steps to ensure your work is handled professionally and ethically by a committed team of human film screeners and script readers.


SCREENPLAY COMPETITION RULES AND REGULATIONS FOR FEATURE LENGTH SCREENPLAYS, SHORT SCRIPTS AND TV/EPISODIC PILOT SCRIPTS:

1. Big Apple Film Festival Screenplay Competition accepts feature length screenplays, short scripts and series/episodic pilot scripts. Feature length scripts must be a minimum of 60 pages and no longer than 150 pages. Series/episodic and short scripts must be under 60 pages.

2. Submitted screenplays cannot have been optioned, purchased, or otherwise produced at the time of submission.

3. Writers may submit as many screenplays as they'd like to the competition, however each script requires a separate application and payment.

4. All entries must be submitted in English.

5. Submissions must include the title, author(s) and any relevant registration or copyright information.

6. Screenplays must be submitted in PDF or MS WORD.

7. All screenplays are considered complete once they are received by the Big Apple Film Festival. No revisions or updated copies will be accepted.

8. Submission fees are non-refundable.

9. Submitter confirms that they have read all rules and regulations prior to submitting your project.

10. SUBMITTER MUST HOLD ALL NECESSARY RIGHTS AND CLEARANCES TO ALL MATERIAL SUBMITTED TO BIG APPLE FILM FESTIVAL, LLC.

11. The organizers of the Big Apple Film Festival and Screenplay Competition wish to make it clear that while we welcome and appreciate all submissions to our festival, we are unable to provide individualized feedback on entries. Furthermore, the selection process for our festival is subjective and may involve various factors related to overall programming considerations. BAFF is under no obligation to provide feedback or comments regarding submitted films or scripts to any applicant. As such, Big Apple Film Festival is not obligated to explain why a particular film or script was not selected for inclusion in the festival, or why a particular script did not advance in our screenplay competition. Our decisions are final and not open to negotiation or appeal.

12. Big Apple Film Festival reserves the right to withdraw any project from our festival program or entry pool at any time for any reason we deem necessary.

13. Entrants agree and acknowledge that the identities, business affiliations, and contact information of film screeners and script readers shall remain strictly confidential and will not be disclosed under any circumstances to the submitter.

14. All submitters who register for a prepaid All-Access Pass to the Agents, Managers & Producers Pitch Forum at the time of entry will automatically receive their pass in the spring of 2026, regardless of whether or not their project is selected for inclusion in the festival.

15. All information provided on this page may be subject to change. This includes, but is not limited to, event dates, event details, industry conferences, networking events, event format, guest speakers, jurors, awards, venue, and other relevant information.

16. DISCLAIMER: By submitting to the Big Apple Film Festival and Screenplay Competition ("BAFF"), you agree to release and hold harmless BAFF, its affiliates, staff, and partners from any and all claims, liabilities, or damages arising from your submission or participation. BAFF is not responsible for loss, damage, or unauthorized use of submitted materials.

17. At Big Apple Film Festival and Screenplay Competition, the integrity of our evaluation process and the protection of your intellectual property are our highest priorities. We require all of our screeners and readers to sign an agreement that explicitly mandates that every submission receive a thorough evaluation conducted solely by a human. The use of any generative AI tool in the review, analysis, or feedback process is strictly prohibited under this contract. We reserve the right to audit feedback to uphold this standard and maintain the commitment outlined in our agreement with them. Our Agreement also includes a strict Confidentiality and Non-Disclosure Clause. Screeners and Readers are contractually obligated to not share, distribute, or discuss any copyrighted material or intellectual property they review outside of the secured film festival and screenplay competition platform and judging process. This agreement also states that all materials provided to the screeners and readers must be thoroughly deleted upon completion of review.

By submitting to the Big Apple Film Festival and Screenplay Competition, you can trust that we have taken robust, contractual steps to ensure your work is handled professionally and ethically by a committed team of human film screeners and script readers.`,
    reviewCount: 440,
    rating: 4.8,
    photoCount: 34,
  },
  // Batch 1 - Major festivals
  {
    id: "sundance-film-festival-2027",
    slug: "sundance-film-festival",
    name: "Sundance Film Festival",
    tagline: "The ultimate gathering of original storytellers and audiences.",
    location: "Park City, Utah",
    country: "United States",
    yearsRunning: 43,
    badges: ["academy-award", "bafta", "top-100"],
    nextDeadline: "August 10, 2026",
    finalDeadline: "September 25, 2026",
    eventDate: "January 21 – January 31, 2027",
    entryFeeFrom: 40,
    categories: ["Feature", "Short", "Documentary", "Virtual Reality", "Animation", "Indigenous / Native Peoples"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=Sundance",
    coverPicture: "https://dummyimage.com/1200x400/000/fff&text=Sundance+Cover",
    about:
      "The Sundance Film Festival is the ultimate gathering of original storytellers and audiences seeking new voices and fresh perspectives.",
    whySubmit: [
      "Academy Award® qualifying for short film categories.",
      "Unmatched global press coverage and industry attendance.",
      "Dedicated tracks for emerging media and VR.",
    ],
    venue: { name: "Ray Theatre", address: "1768 Park Ave", city: "Park City", country: "United States" },
    contact: {
      email: "programming@sundance.org",
      website: "https://www.sundance.org/festivals/",
      instagram: "sundanceorg",
      x: "sundancefest",
    },
    datesAndDeadlines: [
      { label: "Opening Date", date: "May 1, 2026" },
      { label: "Early Deadline", date: "August 10, 2026" },
      { label: "Official Deadline", date: "September 1, 2026" },
      { label: "Late Deadline", date: "September 25, 2026" },
      { label: "Notification Date", date: "December 10, 2026" },
      { label: "Event Date", date: "January 21, 2027" },
    ],
    categoriesAndFees: [
      {
        category: "Feature",
        fees: [
          { deadline: "August 10, 2026", standard: 65, gold: 55 },
          { deadline: "September 1, 2026", standard: 85, gold: 75 },
          { deadline: "September 25, 2026", standard: 110 },
        ],
      },
      {
        category: "Short",
        addOn: "Gold member discount",
        fees: [
          { deadline: "August 10, 2026", standard: 40, gold: 35 },
          { deadline: "September 1, 2026", standard: 60, gold: 50 },
          { deadline: "September 25, 2026", standard: 80 },
        ],
      },
    ],
    awards: ["Grand Jury Prize: Dramatic", "Grand Jury Prize: Documentary", "Directing Award", "Audience Award", "Short Film Grand Jury Prize"],
    rulesExcerpt:
      "Films must be world premieres to be eligible for U.S. and World Dramatic and Documentary Competition categories.",
    rules: rulesTemplate("Sundance Film Festival", "Sundance", { filmCompletionDate: "January 1, 2025" }),
    reviewCount: 1245,
    rating: 4.9,
    photoCount: 42,
  },
  {
    id: "tiff-2026",
    slug: "toronto-international-film-festival",
    name: "Toronto International Film Festival (TIFF)",
    tagline: "Transforming the way people see the world through film.",
    location: "Toronto, Ontario",
    country: "Canada",
    yearsRunning: 51,
    badges: ["academy-award", "top-100", "best-reviewed"],
    nextDeadline: "May 10, 2026",
    finalDeadline: "June 14, 2026",
    eventDate: "September 10 – September 20, 2026",
    entryFeeFrom: 55,
    categories: ["Feature", "Short", "Documentary", "Television", "Asian", "Women"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/ff6600/fff&text=TIFF",
    coverPicture: "https://dummyimage.com/1200x400/ff6600/fff&text=TIFF+Cover",
    about:
      "The Toronto International Film Festival (TIFF) is one of the most prestigious and highly attended film festivals in the world.",
    whySubmit: ["Major launchpad for fall season releases", "People's Choice Award is a historical bellwether for the Oscars"],
    venue: { name: "TIFF Bell Lightbox", address: "350 King St W", city: "Toronto", country: "Canada" },
    contact: { email: "submissions@tiff.net", website: "https://tiff.net/", instagram: "tiff_net", x: "TIFF_NET" },
    datesAndDeadlines: [
      { label: "Opening Date", date: "February 15, 2026" },
      { label: "Early Deadline", date: "May 10, 2026" },
      { label: "Standard Deadline", date: "May 31, 2026" },
      { label: "Final Deadline", date: "June 14, 2026" },
      { label: "Event Date", date: "September 10, 2026" },
    ],
    categoriesAndFees: [
      {
        category: "Feature",
        fees: [
          { deadline: "May 10, 2026", standard: 100 },
          { deadline: "May 31, 2026", standard: 135 },
          { deadline: "June 14, 2026", standard: 160 },
        ],
      },
      {
        category: "Short",
        fees: [
          { deadline: "May 10, 2026", standard: 55 },
          { deadline: "May 31, 2026", standard: 75 },
          { deadline: "June 14, 2026", standard: 95 },
        ],
      },
    ],
    awards: ["People's Choice Award", "Platform Prize", "Best Canadian Feature Film"],
    rulesExcerpt: "Feature films must be at least North American premieres.",
    rules: rulesTemplate("Toronto International Film Festival (TIFF)", "TIFF", { filmCompletionDate: "August 1, 2025" }),
    reviewCount: 980,
    rating: 4.8,
    photoCount: 15,
  },
  {
    id: "sxsw-2027",
    slug: "sxsw-film-festival",
    name: "SXSW Film & TV Festival",
    tagline: "Celebrating the convergence of the interactive, film, and music industries.",
    location: "Austin, Texas",
    country: "United States",
    yearsRunning: 34,
    badges: ["academy-award", "bafta", "top-100"],
    nextDeadline: "August 25, 2026",
    finalDeadline: "October 2, 2026",
    eventDate: "March 12 – March 20, 2027",
    entryFeeFrom: 45,
    categories: ["Feature", "Short", "Documentary", "Music Video", "Television", "Virtual Reality", "Comedy"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000000/ffffff&text=SXSW",
    coverPicture: "https://dummyimage.com/1200x400/000000/ffffff&text=SXSW+Cover",
    about:
      "The SXSW Film & TV Festival is uniquely poised to celebrate raw innovation and emerging talent from both behind and in front of the camera.",
    whySubmit: ["Academy Award® qualifying", "Simultaneous interactive and music festivals offer unparalleled networking"],
    venue: { name: "Paramount Theatre", address: "713 Congress Ave", city: "Austin", country: "United States" },
    contact: { email: "film@sxsw.com", website: "https://www.sxsw.com/festivals/film/", x: "sxsw" },
    datesAndDeadlines: [
      { label: "Early Deadline", date: "August 25, 2026" },
      { label: "Standard Deadline", date: "September 18, 2026" },
      { label: "Final Deadline", date: "October 2, 2026" },
      { label: "Event Date", date: "March 12, 2027" },
    ],
    categoriesAndFees: [
      {
        category: "Feature",
        fees: [
          { deadline: "August 25, 2026", standard: 75 },
          { deadline: "September 18, 2026", standard: 105 },
          { deadline: "October 2, 2026", standard: 145 },
        ],
      },
      {
        category: "Music Video",
        fees: [
          { deadline: "August 25, 2026", standard: 45 },
          { deadline: "September 18, 2026", standard: 55 },
          { deadline: "October 2, 2026", standard: 75 },
        ],
      },
    ],
    awards: ["Narrative Feature Competition", "Documentary Feature Competition", "Midnighters Audience Award"],
    reviewCount: 1102,
    rating: 4.7,
    photoCount: 38,
  },
  // Cannes, Berlinale, Tribeca, Venice, Raindance
  {
    id: "cannes-directors-fortnight-2026",
    slug: "cannes-directors-fortnight",
    name: "Directors' Fortnight (Quinzaine des Cinéastes)",
    tagline: "A free spirit in the heart of Cannes.",
    location: "Cannes",
    country: "France",
    yearsRunning: 58,
    badges: ["top-100", "best-reviewed"],
    nextDeadline: "March 20, 2026",
    finalDeadline: "March 31, 2026",
    eventDate: "May 13 – May 23, 2026",
    entryFeeFrom: 150,
    categories: ["Feature", "Short", "Documentary", "Animation"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/003366/fff&text=Cannes+DF",
    coverPicture: "https://dummyimage.com/1200x400/003366/fff&text=Directors+Fortnight",
    about:
      "Held alongside the Cannes Film Festival, the Directors' Fortnight highlights the most independent and avant-garde films from around the world.",
    whySubmit: ["Unparalleled prestige", "Direct access to influential critics and buyers"],
    venue: { name: "Théâtre Croisette", address: "50 boulevard de la Croisette", city: "Cannes", country: "France" },
    contact: { email: "infos@quinzaine-cineastes.fr", website: "https://www.quinzaine-cineastes.fr/" },
    datesAndDeadlines: [
      { label: "Early Deadline", date: "February 15, 2026" },
      { label: "Final Deadline", date: "March 31, 2026" },
    ],
    categoriesAndFees: [{ category: "Feature", fees: [{ deadline: "March 31, 2026", standard: 150 }] }],
    awards: ["Europa Cinemas Label", "SACD Award"],
    rating: 4.9,
  },
  {
    id: "berlinale-2027",
    slug: "berlin-international-film-festival",
    name: "Berlin International Film Festival (Berlinale)",
    tagline: "The world's largest public film festival.",
    location: "Berlin",
    country: "Germany",
    yearsRunning: 77,
    badges: ["academy-award", "bafta", "top-100"],
    nextDeadline: "October 30, 2026",
    finalDeadline: "November 15, 2026",
    eventDate: "February 11 – February 21, 2027",
    entryFeeFrom: 75,
    categories: ["Feature", "Short", "Documentary", "Experimental"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/cc0000/fff&text=Berlinale",
    about: "The Berlinale is a great cultural event and one of the most important dates for the international film industry.",
    whySubmit: ["Access to the European Film Market (EFM)", "One of the 'Big Three' global festivals"],
    venue: { name: "Berlinale Palast", address: "Marlene-Dietrich-Platz 1", city: "Berlin", country: "Germany" },
    contact: { website: "https://www.berlinale.de/", instagram: "berlinale" },
    datesAndDeadlines: [
      { label: "Shorts Deadline", date: "October 30, 2026" },
      { label: "Features Deadline", date: "November 15, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "November 15, 2026", standard: 175 }] },
      { category: "Short", fees: [{ deadline: "October 30, 2026", standard: 75 }] },
    ],
    awards: ["Golden Bear", "Silver Bear", "Crystal Bear"],
    rating: 4.8,
  },
  {
    id: "tribeca-2026",
    slug: "tribeca-festival",
    name: "Tribeca Festival",
    tagline: "Storytelling in all its forms.",
    location: "New York, New York",
    country: "United States",
    yearsRunning: 25,
    badges: ["academy-award", "top-100"],
    nextDeadline: "Closed (2027 TBD)",
    finalDeadline: "February 4, 2026",
    eventDate: "June 3 – June 14, 2026",
    entryFeeFrom: 50,
    categories: ["Feature", "Short", "Documentary", "Music Video", "Games", "Immersive"],
    eventType: "film-festival",
    isOpen: false,
    pagePicture: "https://dummyimage.com/400x400/1a1a1a/fff&text=Tribeca",
    about: "Co-founded by Robert De Niro, Tribeca has evolved into a massive multi-platform event.",
    whySubmit: ["Top-tier celebrity and industry visibility", "Major platform for Music Videos and XR"],
    datesAndDeadlines: [
      { label: "Early Deadline", date: "October 22, 2025" },
      { label: "Official Deadline", date: "December 3, 2025" },
      { label: "Late Deadline", date: "January 14, 2026" },
    ],
    categoriesAndFees: [
      {
        category: "Feature",
        fees: [
          { deadline: "October 22, 2025", standard: 65 },
          { deadline: "January 14, 2026", standard: 110 },
        ],
      },
    ],
    awards: ["Best Narrative Feature", "Nora Ephron Award"],
    rating: 5.0,
  },
  {
    id: "venice-2026",
    slug: "venice-film-festival",
    name: "Venice International Film Festival",
    tagline: "The world's oldest and most prestigious film festival.",
    location: "Venice Lido",
    country: "Italy",
    yearsRunning: 83,
    badges: ["academy-award", "top-100", "fiapf-accredited"],
    nextDeadline: "April 29, 2026",
    finalDeadline: "June 4, 2026",
    eventDate: "September 2 – September 12, 2026",
    entryFeeFrom: 80,
    categories: ["Feature", "Short", "Virtual Reality", "Documentary"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/996600/fff&text=Venice",
    about: "Organized by La Biennale di Venezia, it is one of the most prestigious festivals in the world.",
    whySubmit: ["The ultimate world stage for auteur cinema", "Pioneer in Venice Immersive (VR)"],
    datesAndDeadlines: [
      { label: "Shorts (Early Bird)", date: "April 29, 2026" },
      { label: "Features (Standard)", date: "May 14, 2026" },
      { label: "Final Feature Deadline", date: "June 4, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "June 15, 2026", standard: 150 }] },
      { category: "Short", fees: [{ deadline: "June 1, 2026", standard: 80 }] },
    ],
    awards: ["Golden Lion", "Silver Lion", "Volpi Cup"],
    rating: 5.0,
  },
  {
    id: "raindance-2026",
    slug: "raindance-film-festival",
    name: "Raindance Film Festival",
    tagline: "Discovering the next generation of independent filmmakers.",
    location: "London",
    country: "United Kingdom",
    yearsRunning: 34,
    badges: ["bafta", "academy-award", "best-reviewed"],
    nextDeadline: "May 10, 2026",
    finalDeadline: "June 12, 2026",
    eventDate: "October 21 – November 1, 2026",
    entryFeeFrom: 35,
    categories: ["Feature", "Short", "Documentary", "Music Video", "Virtual Reality", "Web / New Media"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/33cc33/fff&text=Raindance",
    about: "Raindance is the largest independent film festival in the UK.",
    whySubmit: ["The UK's leading indie festival", "BAFTA and Academy Award qualifying for shorts"],
    datesAndDeadlines: [
      { label: "Early Deadline", date: "April 10, 2026" },
      { label: "Final Deadline", date: "June 12, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "June 12, 2026", standard: 90, gold: 75 }] },
      { category: "Short", fees: [{ deadline: "May 10, 2026", standard: 45, gold: 35 }] },
    ],
    awards: ["Best UK Feature", "Best Discovery"],
    rating: 4.6,
  },
  // Locarno, Sitges, Austin, BIFF, Palm Springs, IDFA, Annecy, Sheffield
  {
    id: "locarno-2026",
    slug: "locarno-film-festival",
    name: "Locarno Film Festival",
    tagline: "The home of auteur cinema.",
    location: "Locarno",
    country: "Switzerland",
    yearsRunning: 79,
    badges: ["top-100"],
    nextDeadline: "May 3, 2026",
    finalDeadline: "June 1, 2026",
    eventDate: "August 5 – August 15, 2026",
    entryFeeFrom: 100,
    categories: ["Feature", "Short", "Documentary"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/ffff00/000&text=Locarno",
    about: "Locarno is one of the world's top-tier festivals, famous for its screenings in the Piazza Grande.",
    whySubmit: ["Prestigious Leopard awards", "High industry visibility in Europe"],
    datesAndDeadlines: [
      { label: "Opening", date: "January 15, 2026" },
      { label: "Final Deadline", date: "June 1, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "June 1, 2026", standard: 150 }] },
      { category: "Short", fees: [{ deadline: "May 3, 2026", standard: 100 }] },
    ],
    awards: ["Pardo d'oro (Golden Leopard)", "Leopard of Tomorrow"],
    rating: 4.8,
  },
  {
    id: "sitges-2026",
    slug: "sitges-film-festival",
    name: "Sitges - International Fantastic Film Festival of Catalonia",
    tagline: "The number one fantasy film festival in the world.",
    location: "Sitges",
    country: "Spain",
    yearsRunning: 59,
    badges: ["academy-award", "top-100"],
    nextDeadline: "July 1, 2026",
    finalDeadline: "July 15, 2026",
    eventDate: "October 8 – October 18, 2026",
    entryFeeFrom: 50,
    categories: ["Horror", "Sci-fi / Fantasy / Thriller", "Animation", "Short"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=Sitges",
    about: "Sitges is the world's foremost international festival specializing in fantasy and horror films.",
    datesAndDeadlines: [{ label: "Final Deadline", date: "July 15, 2026" }],
    categoriesAndFees: [
      { category: "Sci-fi / Fantasy / Thriller", fees: [{ deadline: "July 15, 2026", standard: 75 }] },
    ],
    awards: ["Best Fantastic Genre Feature", "Best Short Film"],
    rating: 4.9,
  },
  {
    id: "austin-2026",
    slug: "austin-film-festival",
    name: "Austin Film Festival",
    tagline: "The Writers' Festival.",
    location: "Austin, Texas",
    country: "United States",
    yearsRunning: 33,
    badges: ["academy-award", "top-100"],
    nextDeadline: "May 20, 2026",
    finalDeadline: "July 7, 2026",
    eventDate: "October 22 – October 29, 2026",
    entryFeeFrom: 40,
    categories: ["Screenplay", "Short Script", "Feature", "Television Script"],
    eventType: "screenwriting",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/003366/fff&text=AFF",
    about: "Austin Film Festival furthers the art and craft of storytelling by inspiring and championing the work of writers.",
    datesAndDeadlines: [
      { label: "Early Bird", date: "March 27, 2026" },
      { label: "Regular", date: "May 20, 2026" },
      { label: "Late", date: "July 7, 2026" },
    ],
    categoriesAndFees: [{ category: "Screenplay", fees: [{ deadline: "July 7, 2026", standard: 70 }] }],
    awards: ["Screenplay Competition Winner", "Hisense Jury Award"],
    rating: 4.7,
  },
  {
    id: "biff-2026",
    slug: "busan-international-film-festival",
    name: "Busan International Film Festival (BIFF)",
    tagline: "The hub of Asian cinema.",
    location: "Busan",
    country: "South Korea",
    yearsRunning: 31,
    badges: ["top-100"],
    nextDeadline: "June 20, 2026",
    finalDeadline: "July 15, 2026",
    eventDate: "October 7 – October 16, 2026",
    entryFeeFrom: 0,
    categories: ["Asian", "Feature", "Documentary", "Short"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/cc0000/fff&text=BIFF",
    about: "The first international film festival in Korea, BIFF has grown into the most influential festival in Asia.",
    datesAndDeadlines: [
      { label: "Shorts Deadline", date: "June 20, 2026" },
      { label: "Features Deadline", date: "July 15, 2026" },
    ],
    categoriesAndFees: [{ category: "Feature", fees: [{ deadline: "July 15, 2026", standard: 0 }] }],
    awards: ["New Currents Award", "Kim Jiseok Award"],
    rating: 4.8,
  },
  {
    id: "pff-2026",
    slug: "palm-springs-shortfest",
    name: "Palm Springs International ShortFest",
    tagline: "The largest short film festival in North America.",
    location: "Palm Springs, California",
    country: "United States",
    yearsRunning: 32,
    badges: ["academy-award", "bafta", "best-reviewed"],
    nextDeadline: "March 1, 2026",
    finalDeadline: "April 1, 2026",
    eventDate: "June 16 – June 22, 2026",
    entryFeeFrom: 30,
    categories: ["Short", "Animation", "Documentary", "Student"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/33ccff/000&text=ShortFest",
    about: "One of the most important short film festivals in the world, with over 300 films screened annually.",
    whySubmit: ["Over 5 Oscars won by ShortFest alumni", "Extensive filmmaker workshops"],
    datesAndDeadlines: [{ label: "Final Deadline", date: "April 1, 2026" }],
    categoriesAndFees: [{ category: "Short", fees: [{ deadline: "April 1, 2026", standard: 60 }] }],
    awards: ["Best of the Festival", "Best International Short"],
    rating: 4.9,
  },
  {
    id: "idfa-2026",
    slug: "idfa-amsterdam",
    name: "IDFA - International Documentary Film Festival Amsterdam",
    tagline: "The world's leading documentary festival.",
    location: "Amsterdam",
    country: "Netherlands",
    yearsRunning: 39,
    badges: ["top-100"],
    nextDeadline: "May 1, 2026",
    finalDeadline: "July 1, 2026",
    eventDate: "November 11 – November 22, 2026",
    entryFeeFrom: 50,
    categories: ["Documentary", "Experimental", "Virtual Reality"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=IDFA",
    about: "IDFA offers an independent and inspiring meeting place for audiences and professionals.",
    datesAndDeadlines: [{ label: "Late Deadline", date: "July 1, 2026" }],
    categoriesAndFees: [{ category: "Documentary", fees: [{ deadline: "July 1, 2026", standard: 75 }] }],
    awards: ["IDFA Award for Best Feature-Length Documentary"],
    rating: 4.8,
  },
  {
    id: "annecy-2026",
    slug: "annecy-animation-festival",
    name: "Annecy International Animation Film Festival",
    tagline: "The world's largest event dedicated to animation.",
    location: "Annecy",
    country: "France",
    yearsRunning: 66,
    badges: ["academy-award", "top-100"],
    nextDeadline: "February 15, 2026",
    finalDeadline: "March 15, 2026",
    eventDate: "June 7 – June 13, 2026",
    entryFeeFrom: 0,
    categories: ["Animation", "Short", "Student", "Television", "Virtual Reality"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/003366/fff&text=Annecy",
    about: "Annecy is the undisputed capital of animation. Its Mifa market is the primary global hub for animation professionals.",
    whySubmit: ["Highest prestige in the animation industry", "MIFA market access", "Academy Award qualifying"],
    datesAndDeadlines: [{ label: "Submission Deadline", date: "March 15, 2026" }],
    categoriesAndFees: [{ category: "Animation", fees: [{ deadline: "March 15, 2026", standard: 0 }] }],
    awards: ["The Cristal for a Feature Film", "The Cristal for a Short Film"],
    rating: 5.0,
  },
  {
    id: "sheffield-2026",
    slug: "sheffield-doc-fest",
    name: "Sheffield DocFest",
    tagline: "The UK's premier documentary festival.",
    location: "Sheffield",
    country: "United Kingdom",
    yearsRunning: 33,
    badges: ["academy-award", "bafta"],
    nextDeadline: "February 6, 2026",
    finalDeadline: "March 6, 2026",
    eventDate: "June 10 – June 15, 2026",
    entryFeeFrom: 30,
    categories: ["Documentary", "Short", "Virtual Reality"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=DocFest",
    about: "Sheffield DocFest is a world leading festival celebrating the art and business of documentary.",
    datesAndDeadlines: [
      { label: "Standard", date: "February 6, 2026" },
      { label: "Late", date: "March 6, 2026" },
    ],
    categoriesAndFees: [{ category: "Documentary", fees: [{ deadline: "March 6, 2026", standard: 45 }] }],
    awards: ["Grand Jury Award", "Youth Jury Award"],
    rating: 4.6,
  },
  {
    id: "clermont-2026",
    slug: "clermont-ferrand-shorts",
    name: "Clermont-Ferrand International Short Film Festival",
    tagline: "The Cannes of short films.",
    location: "Clermont-Ferrand",
    country: "France",
    yearsRunning: 48,
    badges: ["academy-award", "top-100"],
    nextDeadline: "July 15, 2026",
    finalDeadline: "October 5, 2026",
    eventDate: "January 30 – February 7, 2027",
    entryFeeFrom: 0,
    categories: ["Short", "Animation", "Experimental", "Documentary"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/cc3300/fff&text=CF",
    about: "The world's largest short film festival and market.",
    datesAndDeadlines: [{ label: "International Deadline", date: "October 5, 2026" }],
    categoriesAndFees: [{ category: "Short", fees: [{ deadline: "October 5, 2026", standard: 0 }] }],
    awards: ["Grand Prix", "Audience Prize"],
    rating: 4.9,
  },
  {
    id: "slamdance-2027",
    slug: "slamdance-film-festival",
    name: "Slamdance Film Festival",
    tagline: "By filmmakers, for filmmakers.",
    location: "Park City, Utah",
    country: "United States",
    yearsRunning: 33,
    badges: ["academy-award", "best-reviewed"],
    nextDeadline: "July 24, 2026",
    finalDeadline: "October 13, 2026",
    eventDate: "January 22 – January 28, 2027",
    entryFeeFrom: 35,
    categories: ["Feature", "Short", "Experimental", "Documentary"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/ffffff/000&text=Slamdance",
    about: "Running concurrently with Sundance, Slamdance focuses on emerging artists and low-budget independent films.",
    datesAndDeadlines: [
      { label: "Early Bird", date: "July 24, 2026" },
      { label: "Late", date: "October 13, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "October 13, 2026", standard: 110, gold: 90 }] },
    ],
    awards: ["Global Grand Jury Prize", "Spirit of Slamdance"],
    rating: 4.7,
  },
  // BFI LFF, San Sebastian, Hot Docs, AFI FEST, Screamfest, Fantasia
  {
    id: "bfi-lff-2026",
    slug: "bfi-london-film-festival",
    name: "BFI London Film Festival",
    tagline: "Everyone is invited.",
    location: "London",
    country: "United Kingdom",
    yearsRunning: 70,
    badges: ["top-100", "bafta"],
    nextDeadline: "May 27, 2026",
    finalDeadline: "June 2, 2026",
    eventDate: "October 7 – October 18, 2026",
    entryFeeFrom: 45,
    categories: ["Feature", "Short", "XR / Immersive", "Series"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/cc0000/fff&text=BFI+LFF",
    about: "The UK's largest public film event, the BFI London Film Festival screens the best of the year's international cinema.",
    datesAndDeadlines: [
      { label: "Regular Shorts", date: "May 27, 2026" },
      { label: "Late Features", date: "June 2, 2026" },
    ],
    awards: ["LFF Best Film", "Sutherland Award (First Feature)"],
    rating: 4.9,
  },
  {
    id: "ssiff-2026",
    slug: "san-sebastian-film-festival",
    name: "San Sebastian International Film Festival",
    tagline: "The gateway to Latin American cinema in Europe.",
    location: "San Sebastian",
    country: "Spain",
    yearsRunning: 74,
    badges: ["top-100", "fiapf-accredited"],
    nextDeadline: "January 16, 2026",
    finalDeadline: "June 16, 2026",
    eventDate: "September 18 – September 26, 2026",
    entryFeeFrom: 0,
    categories: ["Feature", "Culinary Cinema", "Work in Progress", "Student"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/003366/fff&text=SSIFF",
    about: "A major A-list festival known for its competitive sections and bridge-building between European and Latin American film industries.",
    awards: ["Golden Shell", "Silver Shell"],
    rating: 4.8,
  },
  {
    id: "hot-docs-2026",
    slug: "hot-docs-toronto",
    name: "Hot Docs Canadian International Documentary Festival",
    tagline: "The documentary event of the year.",
    location: "Toronto",
    country: "Canada",
    yearsRunning: 33,
    badges: ["academy-award", "top-100"],
    nextDeadline: "Closed (2027 TBD)",
    finalDeadline: "Closed",
    eventDate: "April 23 – May 3, 2026",
    entryFeeFrom: 50,
    categories: ["Documentary", "Short", "Virtual Reality", "Student"],
    eventType: "film-festival",
    isOpen: false,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=Hot+Docs",
    about: "Hot Docs is North America's largest documentary festival, conference, and market.",
    whySubmit: ["Premier documentary market in North America", "Academy Award qualifying"],
    awards: ["Best International Documentary", "Audience Award"],
    rating: 4.9,
  },
  {
    id: "afi-fest-2026",
    slug: "afi-fest-hollywood",
    name: "AFI FEST",
    tagline: "The American Film Institute's annual celebration.",
    location: "Los Angeles, California",
    country: "United States",
    yearsRunning: 40,
    badges: ["academy-award", "top-100", "bafta"],
    nextDeadline: "March 1, 2026",
    finalDeadline: "May 31, 2026",
    eventDate: "October 21 – October 25, 2026",
    entryFeeFrom: 45,
    categories: ["Feature", "Short", "Documentary", "Animation"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=AFI+FEST",
    about: "AFI FEST is a world-class event showcasing the best films from across the globe at the TCL Chinese Theatres.",
    datesAndDeadlines: [
      { label: "Early Deadline", date: "March 1, 2026" },
      { label: "Official Deadline", date: "April 12, 2026" },
      { label: "Final Deadline", date: "May 31, 2026" },
    ],
    awards: ["Grand Jury Prize", "Special Mention"],
    rating: 4.9,
  },
  {
    id: "screamfest-2026",
    slug: "screamfest-horror-film-festival",
    name: "Screamfest Horror Film Festival",
    tagline: "The Sundance of Horror.",
    location: "Los Angeles, California",
    country: "United States",
    yearsRunning: 26,
    badges: ["top-100", "best-reviewed"],
    nextDeadline: "March 15, 2026",
    finalDeadline: "June 15, 2026",
    eventDate: "October 6 – October 15, 2026",
    entryFeeFrom: 40,
    categories: ["Horror", "Sci-fi / Fantasy / Thriller", "Short", "Feature", "Student"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=Screamfest",
    coverPicture: "https://dummyimage.com/1200x400/8b0000/fff&text=Screamfest+LA",
    about: "Screamfest is the largest and longest-running horror film festival in the United States.",
    whySubmit: ["Premier horror venue in Hollywood", "Discoverer of 'Paranormal Activity'"],
    datesAndDeadlines: [
      { label: "Regular Deadline", date: "March 15, 2026" },
      { label: "Final Deadline", date: "June 15, 2026" },
    ],
    categoriesAndFees: [
      { category: "Feature", fees: [{ deadline: "March 15, 2026", standard: 75 }] },
      { category: "Short", fees: [{ deadline: "March 15, 2026", standard: 40 }] },
    ],
    awards: ["Skull Award", "Best Feature", "Best Short"],
    rating: 4.9,
  },
  {
    id: "fantasia-2026",
    slug: "fantasia-montreal",
    name: "Fantasia International Film Festival",
    tagline: "The world's leading genre film festival.",
    location: "Montreal, Quebec",
    country: "Canada",
    yearsRunning: 30,
    badges: ["top-100", "best-reviewed"],
    nextDeadline: "March 27, 2026",
    finalDeadline: "May 1, 2026",
    eventDate: "July 16 – August 2, 2026",
    entryFeeFrom: 45,
    categories: ["Horror", "Sci-fi / Fantasy / Thriller", "Asian", "Animation", "Action / Adventure"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/000/fff&text=Fantasia",
    about: "Fantasia is an internationally renowned festival known for its massive scale and focus on Asian and genre cinema.",
    awards: ["Cheval Noir Award", "Satoshi Kon Award"],
    rating: 4.9,
  },
  {
    id: "student-academy-awards-2026",
    slug: "student-academy-awards",
    name: "Student Academy Awards (SAA)",
    tagline: "The ultimate honor for collegiate filmmakers.",
    location: "Los Angeles, California",
    country: "United States",
    yearsRunning: 54,
    badges: ["academy-award"],
    nextDeadline: "March 19, 2026",
    finalDeadline: "May 18, 2026",
    eventDate: "October 2026",
    entryFeeFrom: 0,
    categories: ["Narrative", "Documentary", "Animation", "Alternative/Experimental"],
    eventType: "awards-ceremony",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/d4af37/000&text=SAA",
    about: "Established by the Academy of Motion Picture Arts and Sciences, the SAA identifies and supports the next generation of filmmakers.",
    whySubmit: ["Winners gain automatic eligibility for the Oscars", "$5,000 top cash grants"],
    rating: 5.0,
  },
  {
    id: "animafest-zagreb-2026",
    slug: "animafest-zagreb",
    name: "Animafest Zagreb",
    tagline: "The second oldest animation festival in the world.",
    location: "Zagreb",
    country: "Croatia",
    yearsRunning: 54,
    badges: ["academy-award", "top-100"],
    nextDeadline: "February 1, 2026",
    finalDeadline: "March 15, 2026",
    eventDate: "June 8 – June 13, 2026",
    entryFeeFrom: 0,
    categories: ["Short", "Feature", "Student", "Children"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/ff0000/fff&text=Animafest",
    about: "One of the most respected animation events globally, known for its artistic rigor.",
    datesAndDeadlines: [
      { label: "Shorts Deadline", date: "February 1, 2026" },
      { label: "Features Deadline", date: "March 15, 2026" },
    ],
    awards: ["Grand Prix", "Golden Zagreb Award"],
    rating: 4.9,
  },
  {
    id: "telluride-2026",
    slug: "telluride-film-festival",
    name: "Telluride Film Festival",
    tagline: "The best-kept secret in film.",
    location: "Telluride, Colorado",
    country: "United States",
    yearsRunning: 53,
    badges: ["top-100"],
    nextDeadline: "TBA (Spring 2026)",
    finalDeadline: "July 1, 2026",
    eventDate: "September 3 – September 7, 2026",
    entryFeeFrom: 45,
    categories: ["Feature", "Short", "Student"],
    eventType: "film-festival",
    isOpen: true,
    pagePicture: "https://dummyimage.com/400x400/663300/fff&text=Telluride",
    about: "A cinephile's paradise, Telluride often hosts major Oscar contenders in secret.",
    rating: 5.0,
  },
];

export const MOCK_FESTIVALS: FestivalDetail[] = FESTIVALS_RAW.map(toFestival);

export function getFestivalBySlug(slug: string): FestivalDetail | null {
  return MOCK_FESTIVALS.find((f) => f.slug === slug) ?? null;
}
