import { addCacheControl } from "./cache.ts";

const MAX_CACHE_BREAKPOINTS = 4;

export function runSelfTests(): void {
  const messages = [
    { role: "user" as const, content: "first" },
    { role: "assistant" as const, content: "mid" },
    { role: "user" as const, content: "recent-1" },
    { role: "assistant" as const, content: "recent-2" },
  ];
  const cached = addCacheControl(messages);
  const hasCache = (i: number) =>
    Boolean(
      (cached[i] as { providerOptions?: { anthropic?: { cacheControl?: unknown } } })
        .providerOptions?.anthropic?.cacheControl,
    );
  if (!hasCache(0)) throw new Error("first message must be cacheable");
  if (!hasCache(1)) throw new Error("older than last two must be cacheable");
  if (hasCache(2)) throw new Error("second-to-last must stay fresh");
  if (hasCache(3)) throw new Error("last message must stay fresh");

  const longHistory = Array.from({ length: 8 }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `message-${i}`,
  }));
  const longCached = addCacheControl(longHistory);
  const breakpointTotal = longCached.filter((_, i) => {
    const cachedMsg = longCached[i] as {
      providerOptions?: { anthropic?: { cacheControl?: unknown } };
    };
    return Boolean(cachedMsg.providerOptions?.anthropic?.cacheControl);
  }).length;
  if (breakpointTotal !== MAX_CACHE_BREAKPOINTS) {
    throw new Error("anthropic cache breakpoints must stay at or below 4");
  }
}

runSelfTests();
