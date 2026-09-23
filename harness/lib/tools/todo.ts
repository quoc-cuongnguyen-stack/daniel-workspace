import { tool } from "ai";
import { z } from "zod";
import { traceToolActivity } from "../handle/tool-trace.ts";

interface TodoItem {
    id: string;
    description: string;
    state: "pending" | "in_progress" | "completed";
}

const todos: TodoItem[] = [];

export function createTodoTool() {
    return tool({
      description: `Manage a task list for multi-step work.

YOU MUST USE THIS TOOL BEFORE DOING ANY WORK when:
- the task has 3 or more distinct steps,
- the task modifies multiple files,
- or later steps depend on earlier steps.

Required workflow:
1. Add all planned tasks first.
2. Start exactly one task.
3. Complete it before starting another.
4. Keep at most one task in_progress.
5. Do not skip todo tracking once started.

DO NOT USE for:
- simple questions,
- single-file trivial fixes,
- exploratory reads.`,
        inputSchema: z.object({
            action: z.enum(["add", "start", "complete", "list"]),
            description: z.string().optional(),
            id: z.string().optional(),
        }),
        execute: async ({ action, description, id }) => {
            traceToolActivity(
        `[tool] todo execute action=${action} description=${description ?? ""} id=${id ?? ""}`,
            );

            if (action === "add") {
                const item: TodoItem = {
                    id: crypto.randomUUID().slice(0, 8),
                    description: description ?? "(unnamed)",
                    state: "pending",
                };
                todos.push(item);
                return `Added: [${item.id}] ${item.description}`;
            }

            if (action === "start") {
                const active = todos.find((t) => t.state === "in_progress");
                if (active) {
                    return `Already working on: [${active.id}] ${active.description}. Complete it first.`;
                }
                const next = todos.find((t) => t.id === id);
                if (next) {
                    next.state = "in_progress";
                    return `Started: [${next.id}] ${next.description}`;
                }
                return `No todo with id ${id}.`;
            }

            if (action === "complete") {
                const item = todos.find((t) => t.id === id);
                if (item) {
                    item.state = "completed";
                    return `Completed: [${item.id}] ${item.description}`;
                }
                return `No todo with id ${id}.`;
            }

            return todos
                .map((t) => `[${t.state}] ${t.id}: ${t.description}`)
                .join("\n") || "No todos.";
        },
    });
}