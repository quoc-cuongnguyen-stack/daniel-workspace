import { z } from "zod";

export const structuredPlanSchema = z.object({
  goal: z.string().min(1),
  files: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  steps: z.array(z.string()).min(1),
  verification: z.array(z.string()).default([]),
});

export type StructuredPlan = z.infer<typeof structuredPlanSchema>;

export function formatPlanForExecutor(plan: StructuredPlan): string {
  const sections = [
    `# Goal\n${plan.goal}`,
    plan.files.length
      ? `# Files\n${plan.files.map((f) => `- ${f}`).join("\n")}`
      : "",
    plan.constraints.length
      ? `# Constraints\n${plan.constraints.map((c) => `- ${c}`).join("\n")}`
      : "",
    `# Steps\n${plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    plan.verification.length
      ? `# Verification\n${plan.verification.map((v) => `- ${v}`).join("\n")}`
      : "",
    "Execute the steps in order. Do not expand scope beyond the goal and constraints.",
  ];

  return sections.filter(Boolean).join("\n\n");
}

export function parseStructuredPlan(input: unknown): StructuredPlan {
  return structuredPlanSchema.parse(input);
}

export function tryParseStructuredPlan(input: unknown):
  | { ok: true; plan: StructuredPlan }
  | { ok: false; error: string } {
  const result = structuredPlanSchema.safeParse(input);
  if (result.success) {
    return { ok: true, plan: result.data };
  }
  return { ok: false, error: result.error.message };
}
