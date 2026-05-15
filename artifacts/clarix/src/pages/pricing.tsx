import { Link } from "wouter";

export default function Pricing() {
  return (
    <div className="container py-24 max-w-4xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-medium">Clear, Premium Intelligence</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          No algorithmic noise. No sponsored content. Just the most critical developments, analyzed and summarized.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Trial Tier */}
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col">
          <div className="mb-6">
            <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Evaluation</h2>
            <div className="text-4xl font-serif mb-2">Free Trial</div>
            <p className="text-muted-foreground text-sm">Full access for 1 month to evaluate our intelligence.</p>
          </div>
          
          <ul className="space-y-4 flex-1 mb-8">
            {['Full access to all briefings', 'AI-generated summaries', 'Key facts & impact analysis', 'Save articles for later', 'Participate in discussions'].map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-accent mt-1">◈</span>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          
          <Link href="/signup" className="block w-full text-center py-2.5 px-4 rounded-md border border-accent text-accent hover:bg-accent/10 transition-colors font-medium text-sm">
            Start 1-Month Trial
          </Link>
        </div>

        {/* Paid Tier */}
        <div className="rounded-xl border border-accent bg-accent/5 p-8 flex flex-col relative">
          <div className="absolute top-0 right-0 bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-wider py-1 px-3 rounded-bl-lg rounded-tr-xl font-bold">
            Standard
          </div>
          <div className="mb-6">
            <h2 className="font-mono text-sm text-accent uppercase tracking-wider mb-2">Subscriber</h2>
            <div className="text-4xl font-serif mb-2">$29<span className="text-lg text-muted-foreground">/mo</span></div>
            <p className="text-muted-foreground text-sm">Uninterrupted access to premium intelligence.</p>
          </div>
          
          <ul className="space-y-4 flex-1 mb-8">
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">◈</span>
              <span className="text-sm font-medium">Everything in Evaluation</span>
            </li>
            {['Priority access to Deep Dives', 'Ad-free experience guaranteed', 'Early access to new features', 'Direct support'].map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-accent mt-1">◇</span>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          
          <Link href="/signup" className="block w-full text-center py-2.5 px-4 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors font-medium text-sm">
            Subscribe Now
          </Link>
        </div>
      </div>
    </div>
  );
}
