import type { HiggsfieldState, Setup } from "../data/setup.js";
import { claudeStateFrom, higgsfieldStateFrom, serverNameFrom, setupProblem } from "../pure/setup.js";
import { runCli } from "./claude-cli.js";
import { HF_TOOL_PREFIX } from "./queues.js";

/** A check older than this is redone on the next read. */
const FRESH_MS = 5 * 60_000;
const CLI_TIMEOUT_MS = 30_000;

let current: Setup | null = null;
let running: Promise<Setup> | null = null;

const check = async (): Promise<Setup> => {
  const claude = claudeStateFrom(await runCli({ args: ["auth", "status"], timeoutMs: CLI_TIMEOUT_MS }));
  const higgsfield: HiggsfieldState =
    claude === "ok" ? higgsfieldStateFrom(await runCli({ args: ["mcp", "get", serverNameFrom(HF_TOOL_PREFIX)], timeoutMs: CLI_TIMEOUT_MS })) : "unknown";
  return { claude, higgsfield, problem: setupProblem({ claude, higgsfield }), checkedAt: new Date().toISOString() };
};

/** Checks Claude and Higgsfield now. Calls made while a check runs share it. */
export const recheckSetup = (): Promise<Setup> => {
  running ??= check()
    .then((setup: Setup): Setup => {
      current = setup;
      return setup;
    })
    .finally((): void => {
      running = null;
    });
  return running;
};

/** The last check, redone when it is older than five minutes. */
export const readSetup = (): Promise<Setup> => {
  const stale = current === null || Date.now() - Date.parse(current.checkedAt) > FRESH_MS;
  return stale ? recheckSetup() : Promise.resolve(current as Setup);
};
