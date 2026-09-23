import { tool } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { traceToolActivity } from "../handle/tool-trace.ts";
import type { Skill } from "../skills/skills.ts";

// Lesson 11.1: Skills System
export function createLoadSkillTool(skills: Skill[]) {
    const MAX_SKILL_CHARS = 4000;
    const byName = new Map(skills.map((s) => [s.name, s]));

    return tool({
        description: `Load the full content of a skill.

YOU MUST USE THIS TOOL BEFORE ANY OTHER TOOL when:
- the user names a skill (e.g. "check the auth-patterns skill")
- the task matches a listed skill domain (auth, OAuth, login, db, testing, deployment)

WHEN NOT TO USE: tasks unrelated to any available skill.
DO NOT USE FOR: tasks where the skill name is not in the listed skills.
DO NOT search the repo for SKILL.md, skills-lock.json, or skill files. Call this tool instead.`,
        inputSchema: z.object({
            name: z.string().describe("Skill name as listed in the Skills section"),
        }),
        execute: async ({ name }) => {
            traceToolActivity(`[tool] loadSkill execute name=${name}`);
            const skill = byName.get(name);
            if (!skill) return `Unknown skill: ${name}`;
            const content = readFileSync(skill.path, "utf-8");
            return content.length > MAX_SKILL_CHARS
                ? content.slice(0, MAX_SKILL_CHARS) + `\n... (truncated at ${MAX_SKILL_CHARS} chars)`
                : content;
        },
    });
}