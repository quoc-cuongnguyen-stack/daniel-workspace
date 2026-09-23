import {
  formatPlanForExecutor,
  parseStructuredPlan,
  tryParseStructuredPlan,
} from "./plan.ts";

export function runSelfTests(): void {
  const plan = parseStructuredPlan({
    goal: "Add refresh token rotation",
    files: ["src/auth/token-service.ts"],
    constraints: ["Do not change API response shape"],
    steps: ["Implement rotateRefreshToken", "Add tests"],
    verification: ["pnpm typecheck", "pnpm test auth"],
  });

  const formatted = formatPlanForExecutor(plan);
  if (!formatted.includes("rotateRefreshToken")) {
    throw new Error("formatted plan should include steps");
  }

  const bad = tryParseStructuredPlan({ goal: "", steps: [] });
  if (bad.ok) {
    throw new Error("invalid plan should not parse");
  }
}

runSelfTests();
