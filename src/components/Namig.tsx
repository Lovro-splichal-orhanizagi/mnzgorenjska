// Namig "i": kratka beseda ostane na strani, razlaga pa se odpre v oknu šele
// na dotik — razdelek "Več" v Moji ekipi je bil sicer zid besedila.
//
// Okno je domači <dialog> kot v Razlaga.tsx: Escape, fokus in plast nad vsem
// uredi brskalnik.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";

export default function Namig({
  naslov,
  children,
}: {
  naslov: string;
  children: ReactNode;
}) {
  const [odprt, setOdprt] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (odprt && d && !d.open) d.showModal?.();
  }, [odprt]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOdprt(true)}
        aria-label={naslov}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[11px] font-bold leading-none text-slate-400 hover:border-white/40 hover:text-slate-200"
      >
        i
      </button>
      {odprt && (
        <dialog
          ref={ref}
          onClose={() => setOdprt(false)}
          onClick={(e) => e.target === e.currentTarget && setOdprt(false)}
          className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-slate-950 p-0 text-left text-slate-100 shadow-2xl backdrop:bg-slate-950/70"
        >
          <div className="p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-black">{naslov}</h3>
              <button
                onClick={() => setOdprt(false)}
                aria-label={t("tekme.razlaga.zapri")}
                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-semibold hover:bg-white/15"
              >
                ✕
              </button>
            </div>
            <div className="text-sm leading-snug text-slate-300">
              {children}
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
