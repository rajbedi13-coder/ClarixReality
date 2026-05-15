import { Link } from "wouter";

export default function Standard() {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-20 md:py-28">
      <div className="space-y-3 mb-14 animate-fade-up">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">◈ Manifesto</p>
        <h1 className="font-serif text-5xl md:text-7xl font-medium leading-[1.0] tracking-tight">
          The Clarix<br />
          <span className="italic text-accent font-normal">Standard.</span>
        </h1>
      </div>

      <div className="space-y-7 font-serif text-lg md:text-xl leading-relaxed text-foreground/85 animate-fade-up-delayed">
        <p>
          Clarix Reality is not built for endless scrolling.
        </p>
        <p>
          It is built for people who want to understand the world without drowning in noise.
        </p>

        <div className="space-y-1 pt-4">
          <p>We do not chase outrage.</p>
          <p>We do not reward clickbait.</p>
          <p>We do not confuse speed with wisdom.</p>
        </div>

        <div className="space-y-1 pt-4">
          <p>We track signals.</p>
          <p>We explain context.</p>
          <p>We respect attention.</p>
        </div>

        <p className="pt-4">
          Clarix is a daily practice for clearer thinking.
        </p>

        <p className="pt-8 font-serif italic text-2xl md:text-3xl text-accent border-t border-border/60 pt-10">
          Signal over noise.
        </p>
      </div>

      <div className="mt-20 pt-10 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-5 animate-fade-up-slow">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.2em] px-6 py-3.5 hover:opacity-85 transition-opacity"
        >
          Begin reading →
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
        >
          Join the beta
        </Link>
      </div>
    </div>
  );
}
