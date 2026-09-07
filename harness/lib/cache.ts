import type { ModelMessage } from "ai";

export function addCacheControl(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg, i) => {
    if (i === 0) {
      return {
        ...msg,
        providerOptions: { cacheControl: { type: "ephemeral" } },
      };
    }
    if (i < messages.length - 2) {
      return {
        ...msg,
        providerOptions: { cacheControl: { type: "ephemeral" } },
      };
    }
    return msg;
  });
}


{
  const messages = [
    { role: "user" as const, content: "first" },
    { role: "assistant" as const, content: "mid" },
    { role: "user" as const, content: "recent-1" },
    { role: "assistant" as const, content: "recent-2" },
  ];
  const cached = addCacheControl(messages);
  const hasCache = (i: number) =>
    Boolean(
      (cached[i] as { providerOptions?: { cacheControl?: unknown } })
        .providerOptions?.cacheControl,
    );
  if (!hasCache(0)) throw new Error("first message must be cacheable");
  if (!hasCache(1)) throw new Error("older than last two must be cacheable");
  if (hasCache(2)) throw new Error("second-to-last must stay fresh");
  if (hasCache(3)) throw new Error("last message must stay fresh");
}
