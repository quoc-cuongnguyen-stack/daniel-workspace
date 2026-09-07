import type { Tool } from "ai";

/** Course-mode: Haiku-style one tool per model step. Qwen otherwise batches. */
export function limitOneToolPerTurn<T extends Record<string, Tool>>(tools: T) {
  let calls = 0;

  const limited = Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [
      name,
      {
        ...t,
        execute: async (args: never, options: never) => {
          calls += 1;
          if (calls > 1) {
            return "Blocked: only one tool per turn. Wait for that result, then call the next tool.";
          }
          return t.execute!(args, options);
        },
      },
    ]),
  ) as T;

  return {
    tools: limited,
    resetTurn: () => {
      calls = 0;
    },
  };
}
