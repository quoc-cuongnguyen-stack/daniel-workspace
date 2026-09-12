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

export interface SandboxLifecycle {
  afterStart?(sandbox: Sandbox): Promise<void>;
  beforeStop?(sandbox: Sandbox): Promise<void>;
  onTimeout?(sandbox: Sandbox): Promise<void>;
}

/** Lifecycle states for cloud sandboxes. Local/just-bash backends do not run this loop. */
export type SandboxState =
  | "provisioning"
  | "active"
  | "hibernating"
  | "hibernated"
  | "expired"
  | "not_found";

/** Provider-facing status for cloud sandbox lifecycle (Module 7.1–7.2). */
export interface SandboxStatus {
  state: SandboxState;
  /** Unix seconds. Updated only by real activity, never by status polling. */
  lastActivityAt: number;
  /** Unix milliseconds. Must be fetched fresh before lifecycle decisions. */
  expiresAt?: number;
  /** Unix milliseconds. Used to compute the 80% hard-expiry auto-snapshot threshold. */
  provisionedAt?: number;
  snapshotId?: string;
}

export type RegisterSandboxStatusInput = Omit<SandboxStatus, "lastActivityAt"> & {
  lastActivityAt?: number;
};

const statusRegistry = new Map<string, SandboxStatus>();

/** Stub registry for local dev. Cloud backends should query the provider API instead. */
export function registerSandboxStatus(
  sandboxId: string,
  input: RegisterSandboxStatusInput,
): void {
  const nowSec = Date.now() / 1000;
  statusRegistry.set(sandboxId, {
    ...input,
    lastActivityAt: input.lastActivityAt ?? nowSec,
  });
}

/** Clear registry entry (tests and harness teardown). */
export function clearSandboxStatus(sandboxId: string): void {
  statusRegistry.delete(sandboxId);
}

/**
 * Record user-initiated work. Status polling, health checks, and reconnect probes
 * must NOT call this — otherwise the inactivity window never closes.
 */
export function recordSandboxActivity(sandboxId: string): void {
  const record = statusRegistry.get(sandboxId);
  if (!record || record.state !== "active") {
    return;
  }
  record.lastActivityAt = Date.now() / 1000;
}

/**
 * Read sandbox lifecycle state without side effects.
 * Production: fetch fresh status (especially expiresAt) from the provider API.
 */
export async function checkSandboxStatus(sandboxId: string): Promise<SandboxStatus> {
  const record = statusRegistry.get(sandboxId);
  if (!record) {
    return { state: "not_found", lastActivityAt: 0 };
  }

  const status: SandboxStatus = { ...record };

  if (status.expiresAt != null && status.expiresAt < Date.now()) {
    return { ...status, state: "expired" };
  }

  return status;
}

/** Transition to hibernating before snapshot work begins (idempotency guard). */
export function markSandboxHibernating(sandboxId: string): boolean {
  const record = statusRegistry.get(sandboxId);
  if (!record || isSandboxSnapshotIneligible(record.state)) {
    return false;
  }
  statusRegistry.set(sandboxId, { ...record, state: "hibernating" });
  return true;
}

/** Mark a sandbox as hibernated after snapshot+stop completes (stub for cloud provider). */
export function markSandboxHibernated(
  sandboxId: string,
  snapshotId: string,
): void {
  const record = statusRegistry.get(sandboxId);
  if (!record) {
    return;
  }
  statusRegistry.set(sandboxId, {
    ...record,
    state: "hibernated",
    snapshotId,
  });
}

/** Idempotency guard: true when snapshot+stop should not run again. */
export function isSandboxSnapshotIneligible(state: SandboxState): boolean {
  return (
    state === "not_found" ||
    state === "expired" ||
    state === "hibernating" ||
    state === "hibernated"
  );
}
