import type { TMDBPerson } from "@/lib/tmdb/types";

export type TitleCrewGroup = {
  job: string;
  department: string;
  members: TMDBPerson[];
};

export type TitleCrewDepartmentGroup = {
  department: string;
  groups: TitleCrewGroup[];
};

const DEPARTMENT_RANK: Record<string, number> = {
  Directing: 0,
  Writing: 1,
  Production: 2,
  Editing: 3,
  Camera: 4,
  Sound: 5,
  Art: 6,
  "Costume & Make-Up": 7,
  "Visual Effects": 8,
  Lighting: 9,
  Crew: 10,
};

const JOB_RANK: Record<string, number> = {
  Director: 0,
  "Co-Director": 1,
  Screenplay: 2,
  Writer: 3,
  Story: 4,
  Characters: 5,
  Producer: 6,
  "Executive Producer": 7,
  "Associate Producer": 8,
  "Director of Photography": 9,
  Editor: 10,
  "Original Music Composer": 11,
  Composer: 12,
  "Production Design": 13,
  "Art Direction": 14,
  "Set Decoration": 15,
  "Costume Design": 16,
  "Makeup Artist": 17,
  "Visual Effects Supervisor": 18,
  "Special Effects Supervisor": 19,
};

type KeyCrewRule = {
  department: string;
  label: string;
  matches: (job: string) => boolean;
};

function matchesJob(...jobs: string[]) {
  const normalizedJobs = new Set(jobs.map(function (job) {
    return job.toLowerCase();
  }));
  return function (job: string): boolean {
    return normalizedJobs.has(job);
  };
}

const KEY_CREW_RULES: KeyCrewRule[] = [
  {
    department: "Directing",
    label: "Director",
    matches: matchesJob("Director", "Co-Director"),
  },
  {
    department: "Production",
    label: "Producer",
    matches: matchesJob("Producer", "Co-Producer", "Line Producer"),
  },
  {
    department: "Writing",
    label: "Writer",
    matches: matchesJob(
      "Screenplay",
      "Writer",
      "Story",
      "Teleplay",
      "Adaptation",
      "Novel",
      "Original Film Writer",
      "Characters",
    ),
  },
  {
    department: "Production",
    label: "Executive Producers",
    matches: matchesJob("Executive Producer"),
  },
  {
    department: "Production",
    label: "Casting",
    matches: matchesJob("Casting", "Casting Director"),
  },
  {
    department: "Editing",
    label: "Editor",
    matches: matchesJob("Editor"),
  },
  {
    department: "Camera",
    label: "Cinematography",
    matches: matchesJob("Director of Photography", "Cinematography"),
  },
  {
    department: "Directing",
    label: "Assistant Directors",
    matches: function (job) {
      return job.includes("assistant director");
    },
  },
  {
    department: "Directing",
    label: "Additional Directing",
    matches: matchesJob("Additional Directing", "Second Unit Director"),
  },
  {
    department: "Lighting",
    label: "Lighting",
    matches: matchesJob("Gaffer", "Chief Lighting Technician"),
  },
  {
    department: "Camera",
    label: "Camera Operators",
    matches: function (job) {
      return job.includes("camera operator");
    },
  },
  {
    department: "Camera",
    label: "Additional Photography",
    matches: matchesJob(
      "Additional Photography",
      "Second Unit Director of Photography",
    ),
  },
  {
    department: "Art",
    label: "Production Design",
    matches: matchesJob("Production Design"),
  },
  {
    department: "Art",
    label: "Art Direction",
    matches: matchesJob("Art Direction", "Supervising Art Director"),
  },
  {
    department: "Art",
    label: "Set Decoration",
    matches: matchesJob("Set Decoration"),
  },
  {
    department: "Visual Effects",
    label: "Visual Effects",
    matches: matchesJob(
      "Visual Effects Supervisor",
      "VFX Supervisor",
      "Visual Effects Producer",
      "Special Effects Supervisor",
    ),
  },
  {
    department: "Crew",
    label: "Stunts",
    matches: function (job) {
      return job.includes("stunt");
    },
  },
  {
    department: "Sound",
    label: "Composer",
    matches: matchesJob("Original Music Composer", "Composer"),
  },
  {
    department: "Sound",
    label: "Sound",
    matches: matchesJob(
      "Production Sound Mixer",
      "Sound Designer",
      "Supervising Sound Editor",
      "Sound Effects Editor",
      "Supervising ADR Editor",
      "Supervising Dialogue Editor",
      "Dialogue Editor",
      "Re-Recording Mixer",
      "Foley Artist",
      "Foley Editor",
      "Foley Mixer",
      "Music Editor",
      "Music Supervisor",
    ),
  },
  {
    department: "Costume & Make-Up",
    label: "Costume Design",
    matches: matchesJob("Costume Design", "Costume Designer"),
  },
  {
    department: "Costume & Make-Up",
    label: "Makeup",
    matches: matchesJob(
      "Makeup Designer",
      "Makeup Artist",
      "Key Makeup Artist",
      "Prosthetic Designer",
    ),
  },
  {
    department: "Costume & Make-Up",
    label: "Hairstyling",
    matches: matchesJob(
      "Hair Designer",
      "Hairstylist",
      "Key Hair Stylist",
    ),
  },
];

function departmentRank(department: string): number {
  return DEPARTMENT_RANK[department] ?? 99;
}

function jobRank(job: string): number {
  return JOB_RANK[job] ?? 999;
}

function crewGroupKey(person: TMDBPerson): string {
  const job = person.job?.trim() || "Crew";
  const department = person.department?.trim() || "Crew";
  return department + "\0" + job;
}

export function crewByJobs(
  crew: TMDBPerson[] | undefined,
  jobs: string[],
): TMDBPerson[] {
  if (!crew || crew.length === 0 || jobs.length === 0) return [];

  const wanted: Record<string, true> = {};
  for (var i = 0; i < jobs.length; i++) {
    wanted[jobs[i]] = true;
  }

  const seen: Record<number, true> = {};
  const members: TMDBPerson[] = [];
  for (var j = 0; j < crew.length; j++) {
    var person = crew[j];
    var job = person.job?.trim();
    if (!job || !wanted[job] || seen[person.id]) continue;
    seen[person.id] = true;
    members.push(person);
  }
  return members;
}

export function groupTitleCrew(crew: TMDBPerson[]): TitleCrewGroup[] {
  const grouped = new Map<string, TMDBPerson[]>();
  const memberIdsByGroup = new Map<string, Set<number>>();

  for (var i = 0; i < crew.length; i++) {
    var person = crew[i];
    var key = crewGroupKey(person);
    var members = grouped.get(key);
    if (!members) {
      members = [];
      grouped.set(key, members);
      memberIdsByGroup.set(key, new Set<number>());
    }
    var memberIds = memberIdsByGroup.get(key);
    if (!memberIds) {
      memberIds = new Set<number>();
      memberIdsByGroup.set(key, memberIds);
    }
    if (!memberIds.has(person.id)) {
      memberIds.add(person.id);
      members.push(person);
    }
  }

  var groups: TitleCrewGroup[] = [];
  grouped.forEach(function (members, key) {
    var parts = key.split("\0");
    var department = parts[0] || "Crew";
    var job = parts[1] || "Crew";
    members.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    groups.push({ job: job, department: department, members: members });
  });

  groups.sort(function (a, b) {
    var departmentDiff =
      departmentRank(a.department) - departmentRank(b.department);
    if (departmentDiff !== 0) return departmentDiff;
    var jobDiff = jobRank(a.job) - jobRank(b.job);
    if (jobDiff !== 0) return jobDiff;
    return a.job.localeCompare(b.job);
  });

  return groups;
}

export function groupKeyTitleCrew(crew: TMDBPerson[]): TitleCrewGroup[] {
  const membersByLabel = new Map<string, TMDBPerson[]>();
  const memberIdsByLabel = new Map<string, Set<number>>();

  for (var i = 0; i < crew.length; i++) {
    var person = crew[i];
    var job = person.job?.trim().toLowerCase() || "";
    if (!job) continue;

    var rule = KEY_CREW_RULES.find(function (candidate) {
      return candidate.matches(job);
    });
    if (!rule) continue;

    var members = membersByLabel.get(rule.label);
    if (!members) {
      members = [];
      membersByLabel.set(rule.label, members);
      memberIdsByLabel.set(rule.label, new Set<number>());
    }
    var memberIds = memberIdsByLabel.get(rule.label);
    if (!memberIds) {
      memberIds = new Set<number>();
      memberIdsByLabel.set(rule.label, memberIds);
    }
    if (!memberIds.has(person.id)) {
      memberIds.add(person.id);
      members.push(person);
    }
  }

  const groups: TitleCrewGroup[] = [];
  for (var ruleIndex = 0; ruleIndex < KEY_CREW_RULES.length; ruleIndex++) {
    var currentRule = KEY_CREW_RULES[ruleIndex];
    var currentMembers = membersByLabel.get(currentRule.label);
    if (!currentMembers) continue;
    currentMembers.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    groups.push({
      department: currentRule.department,
      job: currentRule.label,
      members: currentMembers,
    });
  }

  return groups;
}

export function groupTitleCrewByDepartment(
  crew: TMDBPerson[],
): TitleCrewDepartmentGroup[] {
  const groups = groupTitleCrew(crew);
  const departments: TitleCrewDepartmentGroup[] = [];

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var currentDepartment = departments[departments.length - 1];
    if (!currentDepartment || currentDepartment.department !== group.department) {
      currentDepartment = { department: group.department, groups: [] };
      departments.push(currentDepartment);
    }
    currentDepartment.groups.push(group);
  }

  return departments;
}

export function titleCrewCreditCount(groups: TitleCrewGroup[]): number {
  return groups.reduce(function (total, group) {
    return total + group.members.length;
  }, 0);
}
