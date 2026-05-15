import type { Quote } from "@/lib/quotes";

/* A standalone "intellectual fragment" card — slots into the article grid
   between briefings to break the rhythm and lend an editorial cadence. */
export function QuoteFragment({ quote }: { quote: Quote }) {
  return (
    <div className="border border-border bg-surface flex flex-col justify-between p-6 md:p-7 min-h-[260px] relative overflow-hidden group">
      <div aria-hidden className="absolute top-3 left-4 font-serif text-7xl leading-none text-accent/15 select-none">"</div>
      <div className="flex flex-col gap-5 mt-2 relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">◈ Fragment</p>
        <blockquote className="font-serif text-xl md:text-[22px] leading-snug text-foreground/90 italic">
          {quote.text}
        </blockquote>
      </div>
      <footer className="mt-6 pt-4 border-t border-border/60 relative">
        <p className="font-mono text-[11px] text-foreground">— {quote.author}</p>
        {quote.context && (
          <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{quote.context}</p>
        )}
      </footer>
    </div>
  );
}

/* A wider, full-row editorial pull-quote used for hero/section transitions. */
export function PullQuote({ quote }: { quote: Quote }) {
  return (
    <div className="border-y border-border bg-surface/50 px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto text-center space-y-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">◈ An intellectual fragment</p>
        <blockquote className="font-serif text-2xl md:text-3xl lg:text-[34px] leading-[1.25] text-foreground/95 italic animate-soft-fade">
          "{quote.text}"
        </blockquote>
        <p className="font-mono text-[11px] text-muted-foreground">
          — {quote.author}{quote.context && <span className="text-muted-foreground/60"> · {quote.context}</span>}
        </p>
      </div>
    </div>
  );
}
