export interface Sandbox {
  type: string; // "local" | "just-bash" | "remote" | string;
  workingDirectory: string; // The working directory of the sandbox. For local sandboxes, this is the same as the `dir` passed to `createLocalSandbox`. For just-bash sandboxes, this is the overlay root.
  readFile(path: string): Promise<string>; // Read the contents of a file in the sandbox. The path is relative to the working directory.
  exec(command: string): Promise<{ stdout: string; exitCode: number }>; // Execute a command in the sandbox. The command is executed in the working directory. Returns the stdout and exit code of the command.
  stop(): Promise<void>; // Stop the sandbox. For local sandboxes, this is a no-op. For just-bash sandboxes, this stops the underlying just-bash process.
  expiresAt?: number;// Optional expiration timestamp for the sandbox. If set, the sandbox should be considered expired after this time.
  snapshot?(): Promise<{ snapshotId: string }>;// Optional method to create a snapshot of the sandbox. Returns a snapshot ID that can be used to restore the sandbox later.
}

// Write is a capability, not a stub. Read-only backends stay Sandbox.
export interface WritableSandbox extends Sandbox {
  writeFile(path: string, content: string): Promise<void>;
}
