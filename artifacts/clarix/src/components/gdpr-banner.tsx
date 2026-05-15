import { useEffect, useState } from "react";

const KEY = "clarix-privacy-acknowledged-v1";

export function GdprBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode etc. — silently skip */
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* noop */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy notice"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-2rem)] max-w-2xl border border-border bg-background/95 backdrop-blur shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
      <div className="flex-1 space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">◇ Privacy</p>
        <p className="font-sans text-[13px] leading-relaxed text-foreground/85">
          Clarix uses essential cookies for sign-in and saved articles. No tracking, no ads, no third-party
          analytics that profile you.
        </p>
      </div>
      <button
        onClick={accept}
        className="shrink-0 font-mono text-[11px] uppercase tracking-wider bg-foreground text-background px-4 py-2 hover:opacity-85 transition-opacity"
      >
        Accept essential
      </button>
    </div>
  );
}
