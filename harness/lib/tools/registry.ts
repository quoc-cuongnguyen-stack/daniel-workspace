/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool, type Tool } from "ai";
import type { ApprovalGate } from "../approved-mode/mode-approval.ts";
import { PARENT_TRUST } from "../approved-mode/trust.ts";
import type { Sandbox, WritableSandbox } from "../sandbox/sandbox.ts";
import type { Skill } from "../skills/skills.ts";
import { createAskUserTool } from "./ask.ts";
import { createBashTool } from "./bash.ts";
import { createGrepTool } from "./grep.ts";
import { createLoadSkillTool } from "./skill.ts";
import { createReadTool } from "./read.ts";
import { createSurveyTool } from "./survey.ts";
import { createTaskTool } from "./task.ts";
import { createTodoTool } from "./todo.ts";
import { createWriteTool } from "./write.ts";

export interface ToolRegistry {
    registerTool(name: string, tool: Tool): void;
    getTool(name: string): Tool | undefined;
    listTools(): string[];
    entries(): [string, Tool][];
}

interface WrapHooks {
    beforeExecute?: (input: any) => any | Promise<any>;
    afterExecute?: (result: any) => any | Promise<any>;
}

export function wrapTool(base: Tool, hooks: WrapHooks): Tool {
    return tool({
        description: base.description,
        inputSchema: base.inputSchema,
        execute: async (input, options) => {
            const transformed = hooks.beforeExecute
                ? await hooks.beforeExecute(input)
                : input;
            if (!base.execute) {
                throw new Error("Tool does not have an execute function");
            }
            const result = await base.execute(transformed, options);
            return hooks.afterExecute ? await hooks.afterExecute(result) : result;
        },
    });
}

export function createRegistry(): ToolRegistry {
    const tools = new Map<string, Tool>();
    return {
        registerTool: (name, nextTool) => {
            tools.set(name, nextTool);
        },
        getTool: (name) => tools.get(name),
        listTools: () => [...tools.keys()],
        entries: () => [...tools.entries()],
    };
}

export function registerBuiltins(
    registry: ToolRegistry,
    sandbox: Sandbox,
    skills: Skill[],
    approval: ApprovalGate,
) {
    const read = createReadTool(sandbox);
    const grep = createGrepTool(sandbox);
    const write = createWriteTool(sandbox as WritableSandbox);
    const bash = createBashTool(sandbox, approval);

    registry.registerTool("read", read);
    registry.registerTool("grep", grep);
    registry.registerTool("write", write);
    registry.registerTool("bash", bash);
    registry.registerTool(
        "task",
        createTaskTool(sandbox, { read, grep, write }, {
            trust: PARENT_TRUST,
            depth: 0,
            parentRole: "orchestrator",
        }),
    );
    registry.registerTool("askUser", createAskUserTool());
    registry.registerTool("survey", createSurveyTool(sandbox, { read, grep }));
    registry.registerTool("todo", createTodoTool());
    registry.registerTool("loadSkill", createLoadSkillTool(skills));
}
