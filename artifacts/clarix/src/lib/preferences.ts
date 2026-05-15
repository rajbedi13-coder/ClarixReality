/**
 * Lightweight client-side interest model for the Explore feed.
 * Stored in localStorage; designed to migrate to a server-side
 * preferences table later without changing the API surface.
 */
const KEY = "clarix:prefs:v1";
const SEEN_KEY = "clarix:prefs:seen";

export type Pref = { token: string; weight: number };

type State = { weights: Record<string, number> };

function load(): State {
  if (typeof window === "undefined") return { weights: {} };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : { weights: {} };
  } catch {
    return { weights: {} };
  }
}

function save(state: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function reinforce(tokens: string[], delta: number) {
  const state = load();
  for (const t of tokens) {
    if (!t) continue;
    state.weights[t] = (state.weights[t] ?? 0) + delta;
  }
  save(state);
}

export function topPreferences(n = 6): string[] {
  const state = load();
  return Object.entries(state.weights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function clearPreferences() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(SEEN_KEY);
}

export function markSeen(id: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(id)) arr.push(id);
    // Cap to last 200 so the URL stays sane
    const trimmed = arr.slice(-200);
    localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function getSeen(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}
