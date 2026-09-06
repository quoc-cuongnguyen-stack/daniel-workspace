// Cursor reports usage once per turn, never per step, so per-step numbers are
// estimated from character counts. The estimate is only useful for the shape of
// the curve; compare the run total against `run.usage` to see the real drift.
const CHARS_PER_TOKEN = 4;

const tokensFromChars = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);

export const estimateTokens = (text: string) => tokensFromChars(text.length);

export interface StepUsage {
  step: number;
  inputTokens: number;
  outputTokens: number;
}

export interface TokenMeter {
  /** Text the model will re-read on every later call, mostly tool results. */
  addContext(text: string): void;
  /**
   * Output the model emitted that does not close a step, such as reasoning.
   * It bills to the next step, since it belongs to the same model turn.
   */
  addOutput(text: string): void;
  /** One model turn. `produced` is the text or tool arguments it emitted. */
  step(produced: string): StepUsage;
  readonly history: readonly StepUsage[];
  totals(): { steps: number; inputTokens: number; outputTokens: number };
}

export function createTokenMeter(seed: string): TokenMeter {
  let contextChars = seed.length;
  let pendingOutputChars = 0;
  let stepNumber = 0;
  const history: StepUsage[] = [];

  return {
    addContext(text) {
      contextChars += text.length;
    },

    addOutput(text) {
      pendingOutputChars += text.length;
    },

    step(produced) {
      stepNumber += 1;
      // Input is the context as it stood before this turn; output is what the
      // turn added. Only then does the output become part of the context.
      const outputChars = pendingOutputChars + produced.length;
      pendingOutputChars = 0;
      const usage: StepUsage = {
        step: stepNumber,
        inputTokens: tokensFromChars(contextChars),
        outputTokens: tokensFromChars(outputChars),
      };
      contextChars += outputChars;
      history.push(usage);
      return usage;
    },

    get history() {
      return history;
    },

    totals() {
      return {
        steps: history.length,
        inputTokens: history.reduce((sum, s) => sum + s.inputTokens, 0),
        outputTokens: history.reduce((sum, s) => sum + s.outputTokens, 0),
      };
    },
  };
}
