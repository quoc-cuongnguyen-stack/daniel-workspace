import {
    readdirSync,
    existsSync,
    readFileSync,
    mkdirSync,
    writeFileSync,
    rmSync,
    mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Skill {
    name: string;
    description: string;
    path: string;
}

function parseFrontmatter(md: string): { description?: string } {
    if (!md.startsWith("---")) return {};
    const end = md.indexOf("\n---", 3);
    if (end < 0) return {};
    const block = md.slice(3, end);
    const descLine = block.split("\n").find((l) => l.startsWith("description:"));
    return {
        description: descLine?.replace("description:", "").trim().replace(/^['"]|['"]$/g, ""),
    };
}

export function discoverSkills(dirs: string[]): Skill[] {
    const skills: Skill[] = [];
    const seen = new Set<string>();

    for (const dir of dirs) {
        if (!existsSync(dir)) continue;
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry, "SKILL.md");
            if (existsSync(path) && !seen.has(entry)) {
                seen.add(entry);
                const content = readFileSync(path, "utf-8");
                const { description } = parseFrontmatter(content);
                skills.push({
                    name: entry,
                    description: description ?? "(no description)",
                    path,
                });
            }
        }
    }

    return skills;
}

{
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