import type { TMDBPerson } from "@/lib/tmdb/types";

export type TitleCrewGroup = {
  job: string;
  department: string;
  members: TMDBPerson[];
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

  for (var i = 0; i < crew.length; i++) {
    var person = crew[i];
    var key = crewGroupKey(person);
    var members = grouped.get(key);
    if (!members) {
      members = [];
      grouped.set(key, members);
    }
    var duplicate = false;
    for (var j = 0; j < members.length; j++) {
      if (members[j].id === person.id) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) members.push(person);
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
