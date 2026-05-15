import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useListExploreCards } from "@workspace/api-client-react";
import { reinforce, topPreferences, markSeen, getSeen, clearPreferences } from "@/lib/preferences";

/* Premium swipe surface: a stack of editorial cards. Right = more like this,
   Left = less like this. Preferences persist via localStorage and are sent
   back to the API as `prefer` to bias the next pull. */
export default function Explore() {
  const [cardIndex, setCardIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; startX: number; startY: number; active: boolean }>({ x: 0, y: 0, startX: 0, startY: 0, active: false });
  const [, setRefreshKey] = useState(0);

  const prefer = topPreferences().join(",");
  const skip = getSeen().slice(-60).join(",");

  const { data: cards, isLoading, refetch } = useListExploreCards(
    { limit: 24, prefer: prefer || undefined, skip: skip || undefined } as any,
    { query: { staleTime: 0, gcTime: 0 } } as any,
  );

  useEffect(() => { setCardIndex(0); }, [cards]);

  const visible = useMemo(() => (cards ?? []).slice(cardIndex, cardIndex + 3), [cards, cardIndex]);

  function tokensOf(card: any): string[] {
    return [card.contentType, card.categorySlug, ...(card.tags ?? [])].filter(Boolean);
  }

  function decide(direction: "like" | "skip") {
    const card = (cards ?? [])[cardIndex];
    if (!card) return;
    markSeen(card.id);
    if (direction === "like") reinforce(tokensOf(card), 1);
    else reinforce(tokensOf(card), -0.4);
    setRefreshKey(k => k + 1);
    setDrag({ x: 0, y: 0, startX: 0, startY: 0, active: false });
    if (cardIndex + 1 >= (cards?.length ?? 0)) {
      // Pull a fresh personalised batch
      setTimeout(() => refetch(), 250);
    } else {
      setCardIndex(i => i + 1);
    }
  }

  // Touch / pointer handlers
  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, startX: e.clientX, startY: e.clientY, active: true });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag(d => ({ ...d, x: e.clientX - d.startX, y: e.clientY - d.startY }));
  }
  function onPointerUp() {
    if (!drag.active) return;
    const threshold = 110;
    if (drag.x > threshold) decide("like");
    else if (drag.x < -threshold) decide("skip");
    else setDrag({ x: 0, y: 0, startX: 0, startY: 0, active: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14 space-y-4 animate-soft-fade">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">◈ Reality Swipe</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
            A discovery feed,<br />
            <span className="italic text-foreground/80">tuned to you.</span>
          </h1>
          <p className="font-serif text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Swipe right to deepen a thread — finance, philosophy, geopolitics, psychology.
            Swipe left to leave it. Your taste shapes the next briefings.
          </p>
        </div>

        {/* Card stack */}
        <div className="relative h-[520px] md:h-[560px] mb-8 select-none">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground animate-soft-pulse">
              Loading editorial cards…
            </div>
          )}

          {!isLoading && (cards?.length ?? 0) === 0 && (
            <div className="absolute inset-0 flex items-center justify-center font-serif text-lg text-muted-foreground italic">
              The deck is empty. Refreshing…
            </div>
          )}

          {visible.map((card: any, i: number) => {
            const isTop = i === 0;
            const tx = isTop ? drag.x : 0;
            const rot = isTop ? drag.x * 0.04 : 0;
            const opacity = isTop ? 1 : 1 - i * 0.15;
            const scale = isTop ? 1 : 1 - i * 0.04;
            const ty = isTop ? drag.y * 0.2 : i * 14;
            return (
              <div
                key={card.id}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerUp : undefined}
                style={{
                  transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
                  opacity,
                  transition: drag.active && isTop ? "none" : "transform 280ms cubic-bezier(.2,.8,.2,1), opacity 200ms",
                  zIndex: 10 - i,
                  touchAction: "pan-y",
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <SwipeCard card={card} dragX={isTop ? drag.x : 0} />
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {(cards?.length ?? 0) > 0 && (
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => decide("skip")}
              className="w-14 h-14 md:w-16 md:h-16 border border-border rounded-full bg-surface text-muted-foreground hover:text-foreground hover:border-foreground transition-all flex items-center justify-center text-2xl"
              aria-label="Skip"
            >
              ✕
            </button>
            <Link
              href={`/article/${(cards ?? [])[cardIndex]?.id ?? ""}`}
              className="px-5 py-3 border border-border bg-background hover:bg-surface transition-colors font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Read full
            </Link>
            <button
              onClick={() => decide("like")}
              className="w-14 h-14 md:w-16 md:h-16 border border-accent bg-accent/10 text-accent rounded-full hover:bg-accent hover:text-background transition-all flex items-center justify-center text-2xl"
              aria-label="More like this"
            >
              ◈
            </button>
          </div>
        )}

        {/* Preferences debug strip */}
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

function SwipeCard({ card, dragX }: { card: any; dragX: number }) {
  const liking = dragX > 30;
  const skipping = dragX < -30;
  const impactDot = card.impactLevel === "high" ? "bg-red-500" : card.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";

  return (
    <article className="w-full h-full bg-surface border border-border flex flex-col overflow-hidden shadow-2xl shadow-black/40">
      {/* Decision overlay */}
      {liking && (
        <div className="absolute top-6 left-6 px-3 py-1.5 border-2 border-accent text-accent font-mono text-xs uppercase tracking-widest bg-background/80 rotate-[-12deg] z-20 pointer-events-none">
          ◈ More like this
        </div>
      )}
      {skipping && (
        <div className="absolute top-6 right-6 px-3 py-1.5 border-2 border-red-500 text-red-500 font-mono text-xs uppercase tracking-widest bg-background/80 rotate-[12deg] z-20 pointer-events-none">
          ✕ Skip
        </div>
      )}

      {card.imageUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-background">
          <img src={card.imageUrl} alt="" className="img-vignette w-full h-full object-cover" draggable={false} />
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 md:p-8 gap-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="text-accent">{card.icon}</span>
            <span>{card.contentType?.replace("_", " ") ?? "Brief"}</span>
            <span className="text-border">·</span>
            <span>{card.category}</span>
          </span>
          <span className={`w-2 h-2 rounded-full ${impactDot}`} aria-label={`${card.impactLevel} impact`} />
        </div>

        <h2 className="font-serif text-2xl md:text-3xl leading-tight tracking-tight text-foreground">
          {card.headline}
        </h2>

        {card.author && (
          <p className="font-serif italic text-sm text-muted-foreground -mt-1">
            {card.author}{card.historicalDate ? ` · ${card.historicalDate}` : ""}
          </p>
        )}

        <p className="font-serif text-[15px] md:text-base leading-relaxed text-foreground/85 line-clamp-6">
          {card.summary}
        </p>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="truncate">via {card.source}</span>
          <span>{card.readTime}</span>
        </div>
      </div>
    </article>
  );
}
