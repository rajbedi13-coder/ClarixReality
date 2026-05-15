/* Heuristic image upscaler. Many publisher CDNs encode size in the path or
   query string. We rewrite common patterns so the swipe deck pulls a sharp
   1024+ px image instead of the 240–400 px RSS thumbnail. Falls back to the
   original URL if no rule matches. */

const PATH_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  // BBC ichef:  /ace/standard/240/cpsprodpb/...  ->  /ace/standard/1536/...
  [/(\/ace\/[a-z_]+\/)(\d{2,4})(\/)/i, (m) => `${m[1]}1536${m[3]}`],
  // Guardian:   /img/media/.../master/0_0_2000_1200/2000.jpg?width=300...
  [/(\/img\/media\/[^/]+\/[^/]+\/[^/]+\/)(\d{2,4})(\.(?:jpg|jpeg|png|webp))/i, (m) => `${m[1]}1600${m[3]}`],
  // Reuters / AP:   /resizer/.../w_240/...  ->  /resizer/.../w_1600/...
  [/\/resizer\/[^/]+\/w_(\d{2,4})\//i, (m) => m[0].replace(`w_${m[1]}`, "w_1600")],
  // NYT:  /images/2024/.../articleLarge.jpg  is fine; thumbStandard etc upgrade
  [/articleInline\.(jpg|jpeg|png|webp)/i, (m) => `articleLarge.${m[1]}`],
  [/thumbStandard\.(jpg|jpeg|png|webp)/i, (m) => `superJumbo.${m[1]}`],
  // WordPress / generic /-300x200.jpg style sizing
  [/-(\d{2,4})x(\d{2,4})(\.(?:jpg|jpeg|png|webp))/i, (m) => m[3]],
];

const QUERY_KEYS = ["w", "width", "size", "h", "height", "quality"];

export function upscaleImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let out = url;

  for (const [pattern, replacer] of PATH_PATTERNS) {
    const m = out.match(pattern);
    if (m) {
      out = out.replace(m[0], replacer(m));
    }
  }

  // Bump small width/size/quality query params
  try {
    const u = new URL(out);
    let touched = false;
    for (const key of QUERY_KEYS) {
      const v = u.searchParams.get(key);
      if (!v) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      if (key === "quality") {
        if (n < 80) { u.searchParams.set(key, "90"); touched = true; }
      } else if (n > 0 && n < 900) {
        u.searchParams.set(key, key.startsWith("h") ? "1024" : "1600");
        touched = true;
      }
    }
    if (touched) out = u.toString();
  } catch {
    /* not an absolute URL — leave alone */
  }

  return out;
}

/* First-sentence lede, the rest as supporting text. Useful for compressing
   wire-style summaries into a tight, scannable card. */
export function splitLede(summary: string | null | undefined): { lede: string; rest: string } {
  if (!summary) return { lede: "", rest: "" };
  const trimmed = summary.trim().replace(/\s+/g, " ");
  const m = trimmed.match(/^(.+?[.!?])(\s+)(.*)$/);
  if (!m) return { lede: trimmed, rest: "" };
  // Avoid splitting on abbreviations like "U.S." or "Mr."
  if (m[1].length < 30 && trimmed.length > 80) {
    const next = trimmed.slice(m[1].length + 1).match(/^(.+?[.!?])(\s+)(.*)$/);
    if (next) return { lede: `${m[1]} ${next[1]}`, rest: next[3] };
  }
  return { lede: m[1], rest: m[3] };
}
