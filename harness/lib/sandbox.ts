export interface Sandbox {
  type: string;
  workingDirectory: string;
  readFile(path: string): Promise<string>;
  exec(command: string): Promise<{ stdout: string; exitCode: number }>;
  stop(): Promise<void>;
  expiresAt?: number;
  snapshot?(): Promise<{ snapshotId: string }>;
}

// Write is a capability, not a stub. Read-only backends stay Sandbox.
export interface WritableSandbox extends Sandbox {
  writeFile(path: string, content: string): Promise<void>;
}
