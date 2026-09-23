import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills } from "./skills.ts";

export function runSelfTests(): void {
  const root = mkdtempSync(join(tmpdir(), "skills-"));
  try {
    const local = join(root, "local");
    const global = join(root, "global");
    mkdirSync(join(local, "auth-patterns"), { recursive: true });
    mkdirSync(join(global, "auth-patterns"), { recursive: true });
    mkdirSync(join(global, "testing"), { recursive: true });
    writeFileSync(
      join(local, "auth-patterns", "SKILL.md"),
      "---\ndescription: local auth\n---\n# Local\n",
    );
    writeFileSync(
      join(global, "auth-patterns", "SKILL.md"),
      "---\ndescription: global auth\n---\n# Global\n",
    );
    writeFileSync(
      join(global, "testing", "SKILL.md"),
      "---\ndescription: 'testing notes'\n---\n# Testing\n",
    );

    const missing = discoverSkills([join(root, "missing")]);
    if (missing.length !== 0) {
      throw new Error("missing skill dirs should yield no skills");
    }

    const skills = discoverSkills([local, global]);
    if (skills.length !== 2) {
      throw new Error(`expected 2 skills, got ${skills.length}`);
    }
    if (skills[0]?.name !== "auth-patterns" || skills[0].description !== "local auth") {
      throw new Error("project-local skills must override globals by name");
    }
    if (skills[1]?.name !== "testing" || skills[1].description !== "testing notes") {
      throw new Error("expected quoted description from the later directory");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

runSelfTests();
