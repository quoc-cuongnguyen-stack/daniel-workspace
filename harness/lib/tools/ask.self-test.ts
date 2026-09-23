import { formatAskOptions, parseAskChoice } from "./ask.ts";

export function runSelfTests(): void {
  const options = ["OAuth", "JWT", "Session cookie"];

  if (formatAskOptions(options) !== "1. OAuth\n2. JWT\n3. Session cookie") {
    throw new Error("formatAskOptions should number each option");
  }

  if (parseAskChoice("2", options) !== "JWT") {
    throw new Error("numeric choice should map to option index");
  }

  if (parseAskChoice("jwt", options) !== "JWT") {
    throw new Error("option text should match case-insensitively");
  }

  if (parseAskChoice("session cookie", options) !== "Session cookie") {
    throw new Error("full option text should match case-insensitively");
  }

  if (parseAskChoice("   ", options) !== null) {
    throw new Error("blank input should not parse");
  }

  if (parseAskChoice("9", options) !== null) {
    throw new Error("out-of-range index should not parse");
  }

  if (parseAskChoice("oauth-ish", options) !== null) {
    throw new Error("partial text should not parse");
  }
}

runSelfTests();
