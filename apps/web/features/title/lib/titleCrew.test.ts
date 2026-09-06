import { describe, expect, it } from "vitest";
import { crewByJobs, groupTitleCrew } from "./titleCrew";

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
