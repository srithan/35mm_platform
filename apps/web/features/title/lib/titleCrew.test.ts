import { describe, expect, it } from "vitest";
import {
  crewByJobs,
  groupKeyTitleCrew,
  groupTitleCrew,
  groupTitleCrewByDepartment,
  titleCrewCreditCount,
} from "./titleCrew";

describe("groupTitleCrew", function () {
  it("groups crew by department and job with stable ordering", function () {
    const groups = groupTitleCrew([
      { id: 3, name: "Lee Smith", profile_path: null, department: "Editing", job: "Editor" },
      { id: 1, name: "Christopher Nolan", profile_path: null, department: "Directing", job: "Director" },
      { id: 2, name: "Jonathan Nolan", profile_path: null, department: "Writing", job: "Screenplay" },
      { id: 4, name: "Christopher Nolan", profile_path: null, department: "Writing", job: "Screenplay" },
    ]);

    expect(groups.map(function (group) {
      return group.job;
    })).toEqual(["Director", "Screenplay", "Editor"]);
    expect(groups[1].members.map(function (person) {
      return person.name;
    })).toEqual(["Christopher Nolan", "Jonathan Nolan"]);
  });

  it("deduplicates the same person within a job group", function () {
    const groups = groupTitleCrew([
      { id: 1, name: "Alex", profile_path: null, department: "Lighting", job: "Gaffer" },
      { id: 1, name: "Alex", profile_path: null, department: "Lighting", job: "Gaffer" },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(1);
  });
});

describe("crewByJobs", function () {
  const crew = [
    { id: 1, name: "Nolan", profile_path: null, department: "Directing", job: "Director" },
    { id: 2, name: "Thomas", profile_path: null, department: "Production", job: "Producer" },
    { id: 3, name: "Nolan Writer", profile_path: null, department: "Writing", job: "Screenplay" },
    { id: 1, name: "Nolan", profile_path: null, department: "Production", job: "Producer" },
    { id: 4, name: "Other Producer", profile_path: null, department: "Production", job: "Producer" },
  ];

  it("keeps TMDB order and deduplicates people per job list", function () {
    expect(crewByJobs(crew, ["Producer"]).map(function (person) {
      return person.id;
    })).toEqual([2, 1, 4]);
  });

  it("matches any of the requested jobs in credit order", function () {
    expect(crewByJobs(crew, ["Screenplay", "Director"]).map(function (person) {
      return person.name;
    })).toEqual(["Nolan", "Nolan Writer"]);
  });

  it("returns an empty list when crew or jobs are missing", function () {
    expect(crewByJobs(undefined, ["Director"])).toEqual([]);
    expect(crewByJobs(crew, [])).toEqual([]);
  });
});

describe("groupKeyTitleCrew", function () {
  it("builds a concise, ordered summary from selected creative roles", function () {
    const groups = groupKeyTitleCrew([
      { id: 1, name: "Director", profile_path: null, department: "Directing", job: "Director" },
      { id: 2, name: "Camera Assistant", profile_path: null, department: "Camera", job: "First Assistant Camera" },
      { id: 3, name: "Sound Designer", profile_path: null, department: "Sound", job: "Sound Designer" },
      { id: 4, name: "Producer", profile_path: null, department: "Production", job: "Producer" },
      { id: 5, name: "Camera Operator", profile_path: null, department: "Camera", job: '"A" Camera Operator' },
    ]);

    expect(groups.map(function (group) {
      return group.job;
    })).toEqual(["Director", "Producer", "Camera Operators", "Sound"]);
    expect(groups.flatMap(function (group) {
      return group.members.map(function (member) {
        return member.name;
      });
    })).not.toContain("Camera Assistant");
  });

  it("deduplicates one person when equivalent jobs share a summary label", function () {
    const groups = groupKeyTitleCrew([
      { id: 1, name: "Sam", profile_path: null, department: "Writing", job: "Writer" },
      { id: 1, name: "Sam", profile_path: null, department: "Writing", job: "Screenplay" },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(1);
  });

  it("normalizes representative craft jobs without hiding their people", function () {
    const groups = groupKeyTitleCrew([
      { id: 1, name: "Assistant", profile_path: null, department: "Directing", job: "First Assistant Director" },
      { id: 2, name: "Second Unit", profile_path: null, department: "Directing", job: "Second Unit Director" },
      { id: 3, name: "DP", profile_path: null, department: "Camera", job: "Director of Photography" },
      { id: 4, name: "Foley", profile_path: null, department: "Sound", job: "Foley Mixer" },
      { id: 5, name: "VFX", profile_path: null, department: "Visual Effects", job: "Visual Effects Supervisor" },
      { id: 6, name: "SFX", profile_path: null, department: "Visual Effects", job: "Special Effects Supervisor" },
      { id: 7, name: "Double", profile_path: null, department: "Crew", job: "Stunt Double" },
      { id: 8, name: "Makeup", profile_path: null, department: "Costume & Make-Up", job: "Makeup Artist" },
      { id: 9, name: "Hair", profile_path: null, department: "Costume & Make-Up", job: "Hairstylist" },
    ]);

    expect(groups.map(function (group) {
      return [group.job, group.members.length];
    })).toEqual([
      ["Cinematography", 1],
      ["Assistant Directors", 1],
      ["Additional Directing", 1],
      ["Visual Effects", 2],
      ["Stunts", 1],
      ["Sound", 1],
      ["Makeup", 1],
      ["Hairstyling", 1],
    ]);
  });
});

describe("groupTitleCrewByDepartment", function () {
  it("retains exact roles under ordered department headings", function () {
    const departments = groupTitleCrewByDepartment([
      { id: 1, name: "Gaffer", profile_path: null, department: "Lighting", job: "Gaffer" },
      { id: 2, name: "Director", profile_path: null, department: "Directing", job: "Director" },
      { id: 3, name: "Best Boy", profile_path: null, department: "Lighting", job: "Best Boy Electric" },
    ]);

    expect(departments.map(function (department) {
      return department.department;
    })).toEqual(["Directing", "Lighting"]);
    expect(departments[1].groups.map(function (group) {
      return group.job;
    })).toEqual(["Best Boy Electric", "Gaffer"]);
    expect(titleCrewCreditCount(departments.flatMap(function (department) {
      return department.groups;
    }))).toBe(3);
  });
});
