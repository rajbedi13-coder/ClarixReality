import { useEffect, useState } from "react";

type Counts = { pending: number; approved: number; rejected: number };
type Tab = "pending" | "approved" | "rejected" | "sources" | "runs";

const TOKEN_KEY = "clarix:admin:token";

async function api(path: string, init: RequestInit = {}) {
  const token = typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-admin-token": token,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

export default function Admin() {
  const [token, setToken] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) ?? "" : ""));
  const [tab, setTab] = useState<Tab>("pending");
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [articles, setArticles] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function saveToken(t: string) {
    setToken(t);
    if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
  }

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      if (tab === "sources") {
        const { sources } = await api("/admin/sources");
        setSources(sources);
      } else if (tab === "runs") {
        const { runs } = await api("/admin/runs");
        setRuns(runs);
      } else {
        const { articles, counts } = await api(`/admin/articles?status=${tab}&limit=100`);
        setArticles(articles); setCounts(counts);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [tab]);

  async function setStatus(id: number, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      await api(`/admin/articles/${id}`, { method: "PATCH", body: JSON.stringify({ reviewStatus: status }) });
      await refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusyId(null); }
  }

  async function delArticle(id: number) {
    if (!confirm("Delete this article permanently?")) return;
    setBusyId(id);
    try {
      await api(`/admin/articles/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusyId(null); }
  }

  async function triggerIngest() {
    setLoading(true);
    try {
      await api("/admin/ingest", { method: "POST" });
      setTimeout(refresh, 4000);
    } catch (e: any) { setErr(e.message); setLoading(false); }
  }

  async function ingestOne(id: number) {
    setBusyId(id);
    try {
      await api(`/admin/sources/${id}/ingest`, { method: "POST" });
      await refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusyId(null); }
  }

  async function toggleSource(s: any, field: "isActive" | "autoPublish") {
    try {
      await api(`/admin/sources/${s.id}`, { method: "PATCH", body: JSON.stringify({ [field]: !s[field] }) });
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  async function deleteSource(id: number) {
    if (!confirm("Delete this source?")) return;
    try {
      await api(`/admin/sources/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 pt-10 pb-24">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">◈ Editorial Console</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Admin Review</h1>
            <p className="font-serif text-sm text-muted-foreground mt-2 max-w-2xl">
              Review the pipeline. Default mode is manual approval — pending items only appear on the public feed once approved.
            </p>
          </div>
          <input
            type="password"
            placeholder="x-admin-token"
            value={token}
            onChange={e => saveToken(e.target.value)}
            className="bg-transparent border border-border px-3 py-2 font-mono text-xs w-64 focus:border-accent outline-none"
          />
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-y border-border py-3 mb-6 text-[11px] font-mono uppercase tracking-wider">
          {(["pending", "approved", "rejected", "sources", "runs"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 border ${tab === t ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t}
              {t === "pending" && counts.pending > 0 && <span className="ml-1.5 text-accent">{counts.pending}</span>}
              {t === "approved" && counts.approved > 0 && <span className="ml-1.5 text-muted-foreground/60">{counts.approved}</span>}
              {t === "rejected" && counts.rejected > 0 && <span className="ml-1.5 text-muted-foreground/60">{counts.rejected}</span>}
            </button>
          ))}
          <button
            onClick={triggerIngest}
            className="ml-auto px-3 py-1.5 border border-accent text-accent bg-accent/5 hover:bg-accent hover:text-background transition-colors"
          >
            ⟳ Run ingest sweep
          </button>
        </div>

        {err && <div className="mb-6 px-4 py-3 border border-red-500/40 bg-red-500/5 text-red-400 font-mono text-xs">{err}</div>}
        {loading && <div className="mb-6 font-mono text-xs text-muted-foreground animate-soft-pulse">Loading…</div>}

        {/* Article queues */}
        {(tab === "pending" || tab === "approved" || tab === "rejected") && (
          <div className="space-y-3">
            {articles.length === 0 && !loading && (
              <div className="py-16 text-center font-serif italic text-muted-foreground">No {tab} articles.</div>
            )}
            {articles.map(a => (
              <article key={a.id} className="border border-border bg-surface/40 p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span className="text-accent">◈ {a.contentType?.replace("_", " ")}</span>
                    <span>· {a.categorySlug}</span>
                    <span>· {a.impactLevel}</span>
                    <span>· {a.source}</span>
                  </div>
                  <h3 className="font-serif text-xl leading-tight">{a.headline}</h3>
                  <p className="font-serif text-sm text-foreground/80 line-clamp-3">{a.summary}</p>
                  {a.whyItMatters && (
                    <p className="font-serif text-xs italic text-muted-foreground line-clamp-2">
                      Why it matters: {a.whyItMatters}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(a.tags ?? []).slice(0, 6).map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 border border-border text-[10px] font-mono text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="inline-block font-mono text-[10px] text-accent hover:underline mt-1 truncate max-w-full">
                    ↗ {a.sourceUrl}
                  </a>
                </div>
                <div className="flex md:flex-col gap-2 self-start">
                  {tab !== "approved" && (
                    <button onClick={() => setStatus(a.id, "approved")} disabled={busyId === a.id}
                      className="px-3 py-1.5 border border-accent text-accent bg-accent/10 hover:bg-accent hover:text-background font-mono text-[10px] uppercase tracking-wider transition-colors">
                      ✓ Approve
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button onClick={() => setStatus(a.id, "rejected")} disabled={busyId === a.id}
                      className="px-3 py-1.5 border border-border hover:border-foreground font-mono text-[10px] uppercase tracking-wider transition-colors">
                      ✕ Reject
                    </button>
                  )}
                  <button onClick={() => delArticle(a.id)} disabled={busyId === a.id}
                    className="px-3 py-1.5 border border-border hover:border-red-500 hover:text-red-500 font-mono text-[10px] uppercase tracking-wider transition-colors">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Sources */}
        {tab === "sources" && (
          <div className="space-y-6">
            <NewSourceForm onCreated={refresh} apiCall={api} />
            <div className="space-y-2">
              {sources.length === 0 && !loading && (
                <div className="py-12 text-center font-serif italic text-muted-foreground">
                  No sources yet — add an RSS feed above to start ingesting.
                </div>
              )}
              {sources.map(s => (
                <div key={s.id} className="border border-border bg-surface/40 p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                      <span className={s.isActive ? "text-accent" : "text-muted-foreground/50"}>
                        {s.isActive ? "● active" : "○ paused"}
                      </span>
                      <span className="text-muted-foreground">tier {s.trustTier}</span>
                      <span className="text-muted-foreground">· {s.categorySlug}</span>
                      <span className="text-muted-foreground">· {s.defaultContentType}</span>
                      {s.autoPublish ? <span className="text-amber-400">auto-publish</span> : <span className="text-muted-foreground">manual review</span>}
                    </div>
                    <h4 className="font-serif text-lg">{s.name}</h4>
                    <p className="font-mono text-[11px] text-muted-foreground truncate">{s.feedUrl}</p>
                    {s.lastFetchedAt && (
                      <p className="font-mono text-[10px] text-muted-foreground/70">
                        last fetch: {new Date(s.lastFetchedAt).toLocaleString()} — {s.lastStatus ?? ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap md:flex-col gap-2">
                    <button onClick={() => ingestOne(s.id)} disabled={busyId === s.id}
                      className="px-3 py-1.5 border border-accent text-accent hover:bg-accent hover:text-background font-mono text-[10px] uppercase tracking-wider">
                      ⟳ Fetch now
                    </button>
                    <button onClick={() => toggleSource(s, "isActive")}
                      className="px-3 py-1.5 border border-border hover:border-foreground font-mono text-[10px] uppercase tracking-wider">
                      {s.isActive ? "Pause" : "Activate"}
                    </button>
                    <button onClick={() => toggleSource(s, "autoPublish")}
                      className="px-3 py-1.5 border border-border hover:border-foreground font-mono text-[10px] uppercase tracking-wider">
                      {s.autoPublish ? "Manual mode" : "Auto-publish"}
                    </button>
                    <button onClick={() => deleteSource(s.id)}
                      className="px-3 py-1.5 border border-border hover:border-red-500 hover:text-red-500 font-mono text-[10px] uppercase tracking-wider">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Runs */}
        {tab === "runs" && (
          <div className="space-y-2">
            {runs.length === 0 && !loading && <div className="py-12 text-center font-serif italic text-muted-foreground">No runs yet.</div>}
            {runs.map(r => (
              <div key={r.id} className="border border-border bg-surface/40 px-4 py-3 grid grid-cols-2 md:grid-cols-6 gap-2 font-mono text-[11px]">
                <span className="text-muted-foreground">#{r.id} src:{r.sourceId ?? "-"}</span>
                <span className="text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</span>
                <span>fetched {r.fetched}</span>
                <span className="text-accent">+{r.inserted} new</span>
                <span className="text-muted-foreground">skipped {r.skipped}</span>
                <span className={r.errors ? "text-red-400 truncate" : "text-emerald-400"}>{r.errors ? r.errors.slice(0, 60) : "ok"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewSourceForm({ onCreated, apiCall }: { onCreated: () => void; apiCall: typeof api }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState("world");
  const [contentType, setContentType] = useState("news");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiCall("/admin/sources", {
        method: "POST",
        body: JSON.stringify({ name, feedUrl, categorySlug, defaultContentType: contentType }),
      });
      setName(""); setFeedUrl(""); setOpen(false);
      onCreated();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-background font-mono text-[11px] uppercase tracking-wider">
        + Add RSS source
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-accent/40 bg-surface p-5 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input required placeholder="Source name (e.g. Reuters World)" value={name} onChange={e => setName(e.target.value)}
          className="bg-transparent border border-border px-3 py-2 font-serif text-sm focus:border-accent outline-none" />
        <input required type="url" placeholder="https://feed.example.com/rss" value={feedUrl} onChange={e => setFeedUrl(e.target.value)}
          className="bg-transparent border border-border px-3 py-2 font-mono text-xs focus:border-accent outline-none" />
        <select value={categorySlug} onChange={e => setCategorySlug(e.target.value)} className="bg-background border border-border px-3 py-2 font-mono text-xs">
          {["world", "geopolitics", "finance", "technology", "psychology", "society", "philosophy", "deep-dives"].map(c =>
            <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={contentType} onChange={e => setContentType(e.target.value)} className="bg-background border border-border px-3 py-2 font-mono text-xs">
          {["news", "essay", "geopolitical", "market_signal", "psychology", "philosophy", "technology", "culture"].map(c =>
            <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {err && <p className="font-mono text-xs text-red-400">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-background font-mono text-[11px] uppercase">Save source</button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-border font-mono text-[11px] uppercase">Cancel</button>
      </div>
    </form>
  );
}
