/* Premium credibility strip — communicates editorial discipline.
   Used on the homepage to ground the platform's trust posture. */
const SIGNALS = [
  { icon: "◈", label: "AI-assisted summaries", note: "Every brief is condensed by AI and verified before publish." },
  { icon: "❖", label: "Source-transparent", note: "Original publisher, link, and date shown on every entry." },
  { icon: "✦", label: "No full-article copying", note: "Title, metadata, and short summary only — read at the source." },
  { icon: "⟡", label: "Citation on every claim", note: "Quotes, history, and statistics carry a primary reference." },
  { icon: "◆", label: "Admin-reviewed by default", note: "Trusted-source auto-publish is opt-in, not the default." },
  { icon: "◇", label: "No clickbait, no doomscroll", note: "Built for calm intelligence, not engagement metrics." },
];

export function TrustSignals() {
  return (
    <section className="my-20 border-y border-border py-14 md:py-20">
      <div className="text-center mb-12 space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">⌬ Editorial discipline</p>
        <h2 className="font-serif text-3xl md:text-4xl tracking-tight">A signal-first platform.</h2>
        <p className="font-serif text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Clarix is built on six commitments. They shape what reaches your feed — and what we deliberately leave out.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SIGNALS.map(s => (
          <div key={s.label} className="border border-border bg-surface/30 p-5 md:p-6 hover:border-accent/40 hover:bg-surface/60 transition-colors">
            <p className="font-serif text-2xl text-accent mb-2">{s.icon}</p>
            <h3 className="font-serif text-lg leading-tight mb-1.5">{s.label}</h3>
            <p className="font-serif text-sm text-muted-foreground leading-relaxed">{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
