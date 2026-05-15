import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useListExploreCards } from "@workspace/api-client-react";
import { reinforce, topPreferences, markSeen, unmarkSeen, getSeen, clearPreferences } from "@/lib/preferences";
import { upscaleImageUrl, splitLede } from "@/lib/imageQuality";

type Decision = "like" | "skip";

/* Premium swipe surface: a stack of editorial cards.
   - Right / → / L key  = more like this
   - Left  / ← / S key  = leave it
   - Up    / ↑ / R key  = open the full brief
   - Space / F key      = flip card for "why it matters" + key facts
   - Z key              = undo last decision
   Preferences persist via localStorage and are sent back to the API as
   `prefer` to bias the next pull. */
export default function Explore() {
  const [cardIndex, setCardIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [, setRefreshKey] = useState(0);
  const [flying, setFlying] = useState<Decision | null>(null);
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; tokens: string[]; direction: Decision }>>([]);

  const prefer = topPreferences().join(",");
  const skip = getSeen().slice(-60).join(",");

  const { data: cards, isLoading, refetch } = useListExploreCards(
    { limit: 24, prefer: prefer || undefined, skip: skip || undefined } as any,
    { query: { staleTime: 0, gcTime: 0 } } as any,
  );

  useEffect(() => { setCardIndex(0); setFlippedId(null); }, [cards]);

  const visible = useMemo(() => (cards ?? []).slice(cardIndex, cardIndex + 3), [cards, cardIndex]);
  const total = cards?.length ?? 0;
  const remaining = Math.max(0, total - cardIndex);

  const tokensOf = (card: any): string[] =>
    [card.contentType, card.categorySlug, ...(card.tags ?? [])].filter(Boolean);

  const advance = useCallback((card: any, direction: Decision) => {
    markSeen(card.id);
    if (direction === "like") reinforce(tokensOf(card), 1);
    else reinforce(tokensOf(card), -0.4);
    setHistory(h => [...h.slice(-19), { id: card.id, tokens: tokensOf(card), direction }]);
    setRefreshKey(k => k + 1);
    setDrag({ x: 0, y: 0, active: false });
    setFlippedId(null);
    if (cardIndex + 1 >= total) {
      setTimeout(() => refetch(), 280);
    } else {
      setCardIndex(i => i + 1);
    }
  }, [cardIndex, total, refetch]);

  const decide = useCallback((direction: Decision) => {
    const card = (cards ?? [])[cardIndex];
    if (!card || flying) return;
    setFlying(direction);
    window.setTimeout(() => {
      setFlying(null);
      advance(card, direction);
    }, 320);
  }, [cards, cardIndex, flying, advance]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    reinforce(last.tokens, last.direction === "like" ? -1 : 0.4);
    unmarkSeen(last.id);
    setHistory(h => h.slice(0, -1));
    setCardIndex(i => Math.max(0, i - 1));
    setRefreshKey(k => k + 1);
  }, [history]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
      const k = e.key.toLowerCase();
      if (k === "arrowright" || k === "l") { e.preventDefault(); decide("like"); }
      else if (k === "arrowleft" || k === "s") { e.preventDefault(); decide("skip"); }
      else if (k === "arrowup" || k === "r") {
        const card = (cards ?? [])[cardIndex];
        if (card) window.location.href = `/article/${card.id}`;
      }
      else if (k === " " || k === "f") {
        e.preventDefault();
        const card = (cards ?? [])[cardIndex];
        if (card) setFlippedId(prev => (prev === card.id ? null : card.id));
      }
      else if (k === "z") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, cards, cardIndex]);

  // Pointer handlers
  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y, active: true });
  }
  function onPointerUp() {
    if (!drag.active) return;
    const threshold = 110;
    if (drag.x > threshold) decide("like");
    else if (drag.x < -threshold) decide("skip");
    else setDrag({ x: 0, y: 0, active: false });
  }

  const topCard = (cards ?? [])[cardIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-4 animate-soft-fade">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">◈ Reality Swipe</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
            A discovery feed,<br />
            <span className="italic text-foreground/80">tuned to you.</span>
          </h1>
          <p className="font-serif text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Swipe right to deepen a thread. Left to leave it. Tap a card for the
            full essence. Your taste shapes the next briefings.
          </p>
        </div>

        {/* Progress + counter */}
        <div className="flex items-center justify-between mb-5 px-1">
          {(() => {
            const segCount = Math.min(Math.max(total, 1), 16);
            const activeSeg = total > 0 ? Math.floor((cardIndex / total) * segCount) : 0;
            return (
              <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={cardIndex}>
                {Array.from({ length: segCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[3px] w-4 transition-all ${i < activeSeg ? "bg-foreground/30" : i === activeSeg ? "bg-accent" : "bg-border"}`}
                  />
                ))}
              </div>
            );
          })()}
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {remaining > 0 ? `${remaining} in deck` : "deck refreshing"}
          </div>
        </div>

        {/* Card stack */}
        <div className="relative h-[600px] md:h-[640px] mb-6 select-none flip-scene">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground animate-soft-pulse">
              Loading editorial cards…
            </div>
          )}

          {!isLoading && total === 0 && (
            <div className="absolute inset-0 flex items-center justify-center font-serif text-lg text-muted-foreground italic">
              The deck is empty. Refreshing…
            </div>
          )}

          {visible.map((card: any, i: number) => {
            const isTop = i === 0;
            const tx = isTop ? drag.x : 0;
            const rot = isTop ? drag.x * 0.04 : 0;
            const opacity = isTop ? 1 : 1 - i * 0.18;
            const scale = isTop ? 1 : 1 - i * 0.045;
            const ty = isTop ? drag.y * 0.18 : i * 16;
            const flyClass = isTop && flying === "like" ? "fly-right" : isTop && flying === "skip" ? "fly-left" : "";
            return (
              <div
                key={card.id}
                onPointerDown={isTop && !flying ? onPointerDown : undefined}
                onPointerMove={isTop && !flying ? onPointerMove : undefined}
                onPointerUp={isTop && !flying ? onPointerUp : undefined}
                onPointerCancel={isTop && !flying ? onPointerUp : undefined}
                style={!flyClass ? {
                  transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
                  opacity,
                  transition: drag.active && isTop ? "none" : "transform 320ms cubic-bezier(.2,.8,.2,1), opacity 220ms",
                  zIndex: 10 - i,
                  touchAction: "pan-y",
                } : { zIndex: 10 - i, touchAction: "pan-y" }}
                className={`absolute inset-0 cursor-grab active:cursor-grabbing ${flyClass} ${isTop ? "deck-rise" : ""}`}
              >
                <SwipeCard
                  card={card}
                  dragX={isTop ? drag.x : 0}
                  flipped={flippedId === card.id}
                  onFlip={() => isTop && setFlippedId(prev => (prev === card.id ? null : card.id))}
                />
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {total > 0 && (
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-6">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="w-11 h-11 md:w-12 md:h-12 border border-border rounded-full bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-all flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Undo last decision (Z)"
              title="Undo (Z)"
            >
              ↺
            </button>
            <button
              onClick={() => decide("skip")}
              className="w-14 h-14 md:w-16 md:h-16 border border-border rounded-full bg-surface text-muted-foreground hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center text-2xl"
              aria-label="Skip (←)"
              title="Skip (← or S)"
            >
              ✕
            </button>
            <button
              onClick={() => topCard && setFlippedId(prev => (prev === topCard.id ? null : topCard.id))}
              className="w-12 h-12 md:w-14 md:h-14 border border-border rounded-full bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-all flex items-center justify-center font-mono text-[11px] uppercase tracking-wider"
              aria-label="Flip card"
              title="Flip (Space or F)"
            >
              {flippedId === topCard?.id ? "↩" : "i"}
            </button>
            <Link
              href={`/article/${topCard?.id ?? ""}`}
              className="px-4 md:px-5 py-3 border border-border bg-background hover:bg-surface transition-colors font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              title="Read full (↑ or R)"
            >
              Read full
            </Link>
            <button
              onClick={() => decide("like")}
              className="w-14 h-14 md:w-16 md:h-16 border border-accent bg-accent/10 text-accent rounded-full hover:bg-accent hover:text-background transition-all flex items-center justify-center text-2xl"
              aria-label="More like this (→)"
              title="More like this (→ or L)"
            >
              ◈
            </button>
          </div>
        )}

        {/* Keyboard hint */}
        <div className="text-center mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          ← skip · → more · ↑ read · space flip · z undo
        </div>

        {/* Preferences strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground/70">
          <span>Tuned by:</span>
          {(topPreferences(8).length ? topPreferences(8) : ["—"]).map(p => (
            <span key={p} className="px-2 py-0.5 border border-border rounded-sm">{p}</span>
          ))}
          {topPreferences().length > 0 && (
            <button
              onClick={() => { clearPreferences(); refetch(); }}
              className="ml-2 underline underline-offset-2 hover:text-foreground"
            >
              reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SwipeCard({ card, dragX, flipped, onFlip }: { card: any; dragX: number; flipped: boolean; onFlip: () => void }) {
  const liking = dragX > 30;
  const skipping = dragX < -30;
  const intensity = Math.min(Math.abs(dragX) / 140, 1);
  const impactDot = card.impactLevel === "high" ? "bg-red-500" : card.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";
  const imgUrl = upscaleImageUrl(card.imageUrl);
  const { lede, rest } = useMemo(() => splitLede(card.summary), [card.summary]);
  const facts: string[] = Array.isArray(card.facts) ? card.facts.filter(Boolean).slice(0, 4) : [];
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`flip-card ${flipped ? "is-flipped" : ""}`}>
      {/* FRONT */}
      <article className="flip-face w-full h-full bg-surface border border-border flex flex-col overflow-hidden shadow-2xl shadow-black/40">
        {/* Drag edge bars */}
        <div className="drag-edge drag-edge--left" style={{ opacity: skipping ? intensity : 0 }} />
        <div className="drag-edge drag-edge--right" style={{ opacity: liking ? intensity : 0 }} />

        {/* Decision overlay */}
        {liking && (
          <div
            className="absolute top-6 left-6 px-3 py-1.5 border-2 border-accent text-accent font-mono text-xs uppercase tracking-widest bg-background/80 rotate-[-12deg] z-20 pointer-events-none"
            style={{ opacity: intensity }}
          >
            ◈ More like this
          </div>
        )}
        {skipping && (
          <div
            className="absolute top-6 right-6 px-3 py-1.5 border-2 border-red-500 text-red-500 font-mono text-xs uppercase tracking-widest bg-background/80 rotate-[12deg] z-20 pointer-events-none"
            style={{ opacity: intensity }}
          >
            ✕ Leave it
          </div>
        )}

        {imgUrl && !imgFailed ? (
          <div className="swipe-img-wrap relative aspect-[16/10] overflow-hidden">
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              className={`swipe-img w-full h-full object-cover ${imgLoaded ? "is-loaded" : ""}`}
            />
            {card.imageCredit && (
              <span className="absolute bottom-2 right-3 z-10 font-mono text-[9px] uppercase tracking-[0.18em] text-white/70 mix-blend-difference">
                {card.imageCredit}
              </span>
            )}
          </div>
        ) : (
          <div className="swipe-img-wrap aspect-[16/10] flex items-center justify-center">
            <span className="font-serif italic text-muted-foreground/50 text-3xl">{card.icon ?? "◈"}</span>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label="Flip card to see why it matters"
          className="flex-1 flex flex-col p-6 md:p-7 gap-3 overflow-hidden cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a,button")) return;
            onFlip();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if ((e.target as HTMLElement).closest("a,button")) return;
              e.preventDefault();
              onFlip();
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="text-accent">{card.icon}</span>
              <span>{card.contentType?.replace("_", " ") ?? "Brief"}</span>
              <span className="text-border">·</span>
              <span>{card.category}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${impactDot}`} aria-label={`${card.impactLevel} impact`} />
              <span>{card.impactLevel}</span>
            </span>
          </div>

          <h2 className="font-serif text-2xl md:text-3xl leading-[1.15] tracking-tight text-foreground">
            {card.headline}
          </h2>

          {card.author && (
            <p className="font-serif italic text-sm text-muted-foreground -mt-1">
              {card.author}{card.historicalDate ? ` · ${card.historicalDate}` : ""}
            </p>
          )}

          {lede && (
            <p className="font-serif text-[15px] md:text-[16px] leading-relaxed text-foreground/90">
              {lede}
            </p>
          )}
          {rest && (
            <p className="font-serif text-[13px] md:text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {rest}
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3 text-[10px] font-mono text-muted-foreground">
            <span className="truncate">via {card.source}</span>
            <span className="flex items-center gap-3">
              <span>{card.readTime}</span>
              <span className="opacity-60">tap for essence →</span>
            </span>
          </div>
        </div>
      </article>

      {/* BACK */}
      <article
        role="button"
        tabIndex={flipped ? 0 : -1}
        aria-label="Flip card back to summary"
        className="flip-face flip-face--back w-full h-full bg-background border border-border flex flex-col overflow-hidden shadow-2xl shadow-black/40 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a,button")) return;
          onFlip();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).closest("a,button")) return;
            e.preventDefault();
            onFlip();
          }
        }}
      >
        <div className="p-7 md:p-9 flex flex-col gap-5 h-full overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-accent">
            <span>◈ Why it matters</span>
            <span className="text-muted-foreground">{card.category}</span>
          </div>

          <h2 className="font-serif text-xl md:text-2xl leading-tight tracking-tight text-foreground/90 italic">
            {card.headline}
          </h2>

          <p className="font-serif text-base md:text-lg leading-relaxed text-foreground/90">
            {card.whyItMatters || "Editorial context will follow as the brief is developed."}
          </p>

          {facts.length > 0 && (
            <div className="border-t border-border pt-5 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Key facts</p>
              <ul className="space-y-2">
                {facts.map((f, i) => (
                  <li key={i} className="flex gap-3 font-serif text-[14px] leading-snug text-foreground/85">
                    <span className="text-accent font-mono mt-1">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto pt-5 border-t border-border flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span>via {card.source}</span>
            <Link href={`/article/${card.id}`} className="text-foreground hover:text-accent" onClick={(e) => e.stopPropagation()}>
              Open full brief →
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
