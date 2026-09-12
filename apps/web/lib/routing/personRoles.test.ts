import { describe, expect, it } from "vitest";
import {
  PERSON_ROLE_SLUGS,
  isPersonRolePath,
  personRoleForCredit,
  personRoleForKnownDepartment,
  type PersonRoleSlug,
} from "./personRoles";

const ALL_ROLE_CREDITS: Array<{
  department?: string;
  expected: PersonRoleSlug;
  isCast?: boolean;
  job?: string;
}> = [
  { expected: "actor", isCast: true },
  { department: "Directing", expected: "creator", job: "Creator" },
  { department: "Directing", expected: "director", job: "Director" },
  { department: "Writing", expected: "writer", job: "Screenplay" },
  { department: "Production", expected: "producer", job: "Executive Producer" },
  { department: "Editing", expected: "editor", job: "Editor" },
  { department: "Camera", expected: "cinematographer", job: "Director of Photography" },
  { department: "Sound", expected: "composer", job: "Original Music Composer" },
  { department: "Art", expected: "production-designer", job: "Production Design" },
  { department: "Art", expected: "art-director", job: "Art Direction" },
  { department: "Art", expected: "sets-decoration", job: "Set Decoration" },
  { department: "Costume & Make-Up", expected: "costume", job: "Costume Designer" },
  { department: "Costume & Make-Up", expected: "makeup", job: "Makeup Artist" },
  { department: "Visual Effects", expected: "visual-effects", job: "VFX Supervisor" },
  { department: "Crew", expected: "special-effects", job: "Special Effects Supervisor" },
  { department: "Crew", expected: "stunts", job: "Stunt Coordinator" },
  { department: "Lighting", expected: "lighting", job: "Gaffer" },
  { department: "Sound", expected: "sound", job: "Sound Designer" },
  { department: "Production", expected: "casting", job: "Casting Director" },
  { department: "Crew", expected: "choreography", job: "Choreographer" },
  { department: "Visual Effects", expected: "animation", job: "Animation Director" },
  { department: "Camera", expected: "camera", job: "Camera Operator" },
  { department: "Art", expected: "art", job: "Art Department Coordinator" },
  { department: "Production", expected: "production", job: "Production Coordinator" },
  { department: "Costume & Make-Up", expected: "costume-and-makeup", job: "Department Coordinator" },
  { department: "Crew", expected: "crew", job: "Script Supervisor" },
];

describe("person role routes", function () {
  it("maps public identity context to canonical roles", function () {
    expect(personRoleForKnownDepartment("Acting")).toBe("actor");
    expect(personRoleForKnownDepartment("Production")).toBe("producer");
    expect(personRoleForCredit({ isCast: true })).toBe("actor");
    expect(
      personRoleForCredit({ department: "Directing", job: "Director" }),
    ).toBe("director");
    expect(
      personRoleForCredit({ department: "Production", job: "Producer" }),
    ).toBe("producer");
  });

  it("keeps specialist crew roles distinct", function () {
    expect(
      personRoleForCredit({ department: "Crew", job: "Stunt Coordinator" }),
    ).toBe("stunts");
    expect(
      personRoleForCredit({ department: "Lighting", job: "Gaffer" }),
    ).toBe("lighting");
    expect(
      personRoleForCredit({ department: "Art", job: "Set Decoration" }),
    ).toBe("sets-decoration");
    expect(
      personRoleForCredit({
        department: "Crew",
        job: "Special Effects Supervisor",
      }),
    ).toBe("special-effects");
    expect(
      personRoleForCredit({
        department: "Visual Effects",
        job: "Visual Effects Supervisor",
      }),
    ).toBe("visual-effects");
  });

  it("classifies a representative credit for every public cast and crew route", function () {
    expect(ALL_ROLE_CREDITS.map((item) => item.expected).sort()).toEqual(
      [...PERSON_ROLE_SLUGS].sort(),
    );
    for (const item of ALL_ROLE_CREDITS) {
      expect(
        personRoleForCredit({
          department: item.department,
          isCast: item.isCast,
          job: item.job,
        }),
      ).toBe(item.expected);
    }
  });

  it("recognizes role pages without treating arbitrary profile paths as people", function () {
    expect(isPersonRolePath("/stunts/vic-armstrong")).toBe(true);
    expect(isPersonRolePath("/lighting/roger-deakins")).toBe(true);
    expect(isPersonRolePath("/actor")).toBe(false);
    expect(isPersonRolePath("/random-user/diary")).toBe(false);
  });
});
