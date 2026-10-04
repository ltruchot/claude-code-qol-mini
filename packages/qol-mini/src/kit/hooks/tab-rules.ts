import type { State } from "./marker.ts";
import type { Payload } from "./payload.ts";
import { endsOnQuestion, pausedOnBackground } from "./turn.ts";

const STATES = new Set<string>(["working", "blocked", "idle"]);

export function parseState(arg: string | undefined): State {
  return arg !== undefined && STATES.has(arg) ? (arg as State) : "idle";
}

const truthy = (value: unknown): boolean => typeof value === "string" && value !== "";

// The state to paint, or null to leave the tab alone
export function resolveState(state: State, data: Payload): State | null {
  // Only the main thread paints green: a subagent fires its own PostToolBatch
  // after the orchestrator's Stop. Red from a subagent is a real block.
  if (state === "working" && (truthy(data["agent_id"]) || truthy(data["agent_type"]))) return null;
  if (state !== "idle") return state;
  // Parked on background work is not idle: the session resumes on its own.
  if (pausedOnBackground(data)) return "working";
  // A turn that ends on a question is blocked on you.
  return endsOnQuestion(data) ? "blocked" : "idle";
}
