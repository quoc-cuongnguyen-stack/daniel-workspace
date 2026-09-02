import type { SDKCustomTool, SDKJsonValue } from "@cursor/sdk";
import { z } from "zod";

export function tool<T extends z.ZodType>({
  description,
  inputSchema,
  execute,
}: {
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<string>;
}): SDKCustomTool {
  return {
    description,
    inputSchema: z.toJSONSchema(inputSchema) as Record<string, SDKJsonValue>,
    execute: async (args) => execute(inputSchema.parse(args)),
  };
}
