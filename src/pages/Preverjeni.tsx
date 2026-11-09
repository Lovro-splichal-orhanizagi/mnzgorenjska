// Javna stran Preverjeni igralski profil (`/verified`): kaj preverjen profil
// prinese, kako do njega in kaj je v tvojem primeru naslednji korak. Nakup je
// na strani igralca (`PreverjeniProfil`), tu je le en gumb nanj. V aplikaciji
// ni ne cene ne gumba za nakup (Apple ne dovoli napotkov na plačila zunaj
// trgovine), kot drugod (`jeNativno()`).
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "../components/Povezava";
import { Kljukica } from "../components/ZnakPreverjen";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useNaslov } from "../lib/naslov";
import { izbranostJeZivo } from "../lib/izbranost";
import { jeNativno } from "../lib/platforma";
import { jeMladinskiSlug } from "../lib/prevzem";
import { useTekmovanje, zLigo } from "../lib/tekmovanje";
import { t, tx } from "../i18n";

/** Kje je obiskovalec na poti do preverjenega profila. */
type Stanje =
  | { vrsta: "nalaga" }
  /** Ni prijavljen ali še nima zahtevka: poišče svoj profil. */
  | { vrsta: "poisci" }
  /** Zahtevek za prevzem čaka na potrditev. */
  | { vrsta: "caka"; pot: string }
  /** Potrjen, polnoleten, še ne preverjen: nakup je na njegovem profilu. */
  | { vrsta: "kupi"; pot: string }
  /** Potrjen odrasel brez nakupa (aplikacija, nakup še ni odprt): le profil. */
  | { vrsta: "profil"; pot: string }
  | { vrsta: "preverjen"; pot: string }
  /** Mladinski ali anonimiziran profil: brez ponudbe. */
  | { vrsta: "brezPonudbe" };

/**
 * Stanje obiskovalca iz njegovih zahtevkov za prevzem, pravice `je_preverjen`
 * in lige igralca. `ponudba`: nakup je odprt (stikalo) in nismo v aplikaciji.
 */
function useStanje(ponudba: boolean | null): Stanje {
  const { session, loading } = useAuth();
  const { vsaTekmovanja } = useTekmovanje();
  const uid = session?.user.id ?? null;
  const [stanje, setStanje] = useState<Stanje>({ vrsta: "nalaga" });
  const ligeNalozene = vsaTekmovanja.length > 0;

  useEffect(() => {
    if (loading || ponudba === null) return;
    if (!uid) return setStanje({ vrsta: "poisci" });
    if (!ligeNalozene) return;
    let velja = true;
    void (async () => {
      const { data: zz } = await supabase
        .from("zahtevki_igralca")
        .select("player_id, status")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);
      const potrjen = zz?.find((z) => z.status === "potrjen");
      const cakajoc = zz?.find((z) => z.status === "cakajoc");
      const id = (potrjen ?? cakajoc)?.player_id;
      if (id == null) return velja && setStanje({ vrsta: "poisci" });
      const [{ data: p }, preverjen] = await Promise.all([
        supabase
          .from("players")
          .select("id, full_name, competition_id")
          .eq("id", id)
          .maybeSingle(),
        potrjen
          ? supabase.rpc("je_preverjen", { p_player_id: id })
          : Promise.resolve({ data: false }),
      ]);
      if (!velja) return;
      const slug = vsaTekmovanja.find(
        (tm) => tm.id === p?.competition_id,
      )?.slug;
      const pot = zLigo(`/player/${id}`, slug);
      if (!potrjen) return setStanje({ vrsta: "caka", pot });
      if (preverjen.data) return setStanje({ vrsta: "preverjen", pot });
      // Mladinec in skrito ime nimata ponudbe (kot na strani igralca).
      if (
        !p ||
        String(p.full_name ?? "").startsWith("#") ||
        jeMladinskiSlug(slug)
      )
        return setStanje({ vrsta: "brezPonudbe" });
      setStanje(
        ponudba
          ? {
              vrsta: "kupi",
              pot: `${pot}${pot.includes("?") ? "&" : "?"}preveri=1`,
            }
          : { vrsta: "profil", pot },
      );
    })();
    return () => {
      velja = false;
    };
  }, [loading, uid, ponudba, ligeNalozene, vsaTekmovanja]);

  return stanje;
}

export default function Preverjeni() {
  useNaslov(t("preverjeni.naslov"));
  // Nakup je odprt, ko baza pokaže preverjene vsem (`vidi_preverjene`), in le na spletu.
  const [vidi, setVidi] = useState<boolean | null>(null);
  const [izbranost, setIzbranost] = useState(false);
  useEffect(() => {
    let velja = true;
    void Promise.resolve(supabase.rpc("vidi_preverjene")).then(
      ({ data }) => velja && setVidi(data === true),
    );
    void izbranostJeZivo().then((v) => velja && setIzbranost(v));
    return () => {
      velja = false;
    };
  }, []);
  const ponudba = vidi === null ? null : vidi && !jeNativno();
  const stanje = useStanje(ponudba);
  // Preverjen profil ne prodaja: brez korakov in cene, ko ga ima, in brez ponudbe.
  const prodaja =
    stanje.vrsta !== "preverjen" &&
    stanje.vrsta !== "brezPonudbe" &&
    stanje.vrsta !== "nalaga";

  const koristi = [
    t("preverjeni.kaj.kljukica"),
    t("preverjeni.kaj.profil"),
    t("preverjeni.kaj.posnetki"),
    t("preverjeni.kaj.ogledi"),
    ...(izbranost ? [t("preverjeni.kaj.izbranost")] : []),
  ];
  const koraki = [
    "poisci",
    "prevzemi",
    ...(ponudba ? (["izberi"] as const) : []),
    "uredi",
  ] as const;

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-300">
            <Kljukica velikost={16} />
            {t("preverjeni.naslov")}
          </p>
          <h1 className="text-4xl font-black leading-[1.05] naslov sm:text-5xl">
            {t("preverjeni.glava")}
          </h1>
          <p className="max-w-xl text-base text-slate-300">
            {t("preverjeni.uvod")}
          </p>
          <Cta stanje={stanje} />
        </div>
        <PrimerProfila />
      </section>

      {stanje.vrsta !== "brezPonudbe" && (
        <section aria-labelledby="preverjeni-kaj" className="space-y-3">
          <h2 id="preverjeni-kaj" className="text-xl font-black naslov">
            {t("preverjeni.kaj.naslov")}
          </h2>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {koristi.map((k) => (
              <li
                key={k}
                className="flex gap-3 py-3 text-sm text-slate-200 sm:text-base"
              >
                <span
                  className="mt-0.5 font-black text-gnl-300"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {k}
              </li>
            ))}
          </ul>
        </section>
      )}

      {prodaja && (
        <section aria-labelledby="preverjeni-koraki" className="space-y-4">
          <h2 id="preverjeni-koraki" className="text-xl font-black naslov">
            {t("preverjeni.koraki.naslov")}
          </h2>
          <ol className="space-y-0">
            {koraki.map((k, n) => (
              <li key={k} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Črta med koraki: pot po igrišču od koraka do koraka. */}
                {n < koraki.length - 1 && (
                  <span
                    className="absolute left-[1.125rem] top-10 h-[calc(100%-2.5rem)] w-px bg-gnl-400/30"
                    aria-hidden="true"
                  />
                )}
                <span
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gnl-500 text-base font-black text-slate-950"
                  aria-hidden="true"
                >
                  {n + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <h3 className="font-bold text-slate-100">
                    {t(`preverjeni.koraki.${k}.naslov`)}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {t(`preverjeni.koraki.${k}.opis`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {prodaja && ponudba && (
        <section
          aria-labelledby="preverjeni-cena"
          className="space-y-2 border-t border-white/10 pt-6"
        >
          <h2 id="preverjeni-cena" className="text-xl font-black naslov">
            {t("preverjeni.cena.naslov")}
          </h2>
          <p className="text-lg font-bold text-slate-100">
            {t("igralci.preverjen.ponudba.letna")}{" "}
            <span className="font-normal text-slate-400">·</span>{" "}
            {t("igralci.preverjen.ponudba.dozivljenjska")}
          </p>
          <p className="text-sm text-slate-300">
            {t("preverjeni.cena.obnova")}
          </p>
          <p className="text-sm text-slate-300">
            {t("igralci.izlozba.ponudba.opomba")}
          </p>
          <p className="text-xs text-slate-400">
            {tx(
              "igralci.preverjen.ponudba.pogoji",
              {},
              {
                pogoji: (v) => (
                  <a href="/legal#placljivo" className="text-sky-300 underline">
                    {v}
                  </a>
                ),
              },
            )}
          </p>
        </section>
      )}
    </div>
  );
}

/** Eden glavni gumb, odvisen od tega, kje je obiskovalec. */
function Cta({ stanje }: { stanje: Stanje }) {
  const gumb =
    "gumb-glavni inline-flex min-h-12 items-center justify-center px-6 text-base";
  switch (stanje.vrsta) {
    case "nalaga":
      // Prostor je rezerviran: stran ob prihodu stanja ne skoči.
      return (
        <div
          className="min-h-[4.5rem]"
          role="status"
          aria-label={t("preverjeni.nalaga")}
        />
      );
    case "poisci":
      return (
        <div className="space-y-1.5">
          <Link to="/players" className={gumb}>
            {t("preverjeni.cta.poisci")}
          </Link>
          <p className="text-xs text-slate-400">
            {t("preverjeni.cta.poisciOpis")}
          </p>
        </div>
      );
    case "caka":
      return (
        <div className="kartica max-w-md space-y-2 border-amber-400/30 p-3 text-sm">
          <p className="font-semibold text-amber-200">
            {t("preverjeni.cta.caka")}
          </p>
          <Link
            to={stanje.pot}
            className="gumb-tih inline-flex min-h-11 items-center px-4 text-sm"
          >
            {t("preverjeni.cta.odpriZahtevek")}
          </Link>
        </div>
      );
    case "kupi":
      return (
        <div className="space-y-1.5">
          <Link to={stanje.pot} className={gumb}>
            {t("preverjeni.cta.preveri")}
          </Link>
          <p className="text-xs text-slate-400">
            {t("preverjeni.cta.preveriOpis")}
          </p>
        </div>
      );
    case "profil":
      return (
        <Link to={stanje.pot} className={gumb}>
          {t("preverjeni.cta.profil")}
        </Link>
      );
    case "preverjen":
      return (
        <div className="space-y-1.5">
          <Link to={stanje.pot} className={gumb}>
            {t("preverjeni.cta.profil")}
          </Link>
          <p className="text-xs text-slate-400">
            {t("preverjeni.cta.preverjen")}
          </p>
        </div>
      );
    case "brezPonudbe":
      return (
        <p className="max-w-md text-sm text-slate-400">
          {t("preverjeni.cta.brezPonudbe")}
        </p>
      );
  }
}

/**
 * Primer postavitve preverjenega profila: ista kljukica, pasica, avatar,
 * opis, povezave in ploščice posnetkov kot v izložbi, a brez izmišljenih
 * podatkov: slika je igrišče SLFF, grb je naš, besedila so označena kot primer.
 */
function PrimerProfila() {
  return (
    <figure className="m-0 space-y-2">
      <div
        aria-hidden="true"
        className="izlozba izlozba-okvir overflow-hidden rounded-2xl"
        style={{ "--poudarek": "#34d399" } as CSSProperties}
      >
        <div className="relative aspect-[3/1]">
          <picture>
            <source srcSet="/foto/igrisce.webp" type="image/webp" />
            <img
              src="/foto/igrisce.jpg"
              alt=""
              width={1200}
              height={400}
              className="h-full w-full object-cover"
            />
          </picture>
          <div className="izlozba-pasica-senca absolute inset-0" />
        </div>
        <div className="relative -mt-8 space-y-3 px-4 pb-4">
          <div className="flex items-end gap-3">
            <img
              src="/logo/slff-grb.png"
              alt=""
              width={64}
              height={64}
              className="izlozba-foto h-16 w-16 shrink-0 rounded-full bg-slate-900 object-contain p-1"
            />
            <div className="min-w-0 pb-0.5">
              <p className="flex min-w-0 items-center gap-1.5 text-lg font-black text-white">
                <span className="truncate">{t("preverjeni.primer.ime")}</span>
                <Kljukica velikost={20} />
              </p>
              <p className="truncate text-xs text-slate-300">
                {t("preverjeni.primer.klub")}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-200">
            {t("preverjeni.primer.opis")}
          </p>
          <ul className="flex flex-wrap gap-3 text-sm text-gnl-300">
            <li>{t("igralci.preverjen.youtube")}</li>
            <li>{t("igralci.preverjen.x")}</li>
          </ul>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="izlozba-poster relative flex aspect-video items-center justify-center rounded-xl"
              >
                <span className="izlozba-gumb-predvajaj !h-9 !w-9">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </span>
                <span className="absolute bottom-1 left-2 hidden text-[10px] font-semibold text-slate-200 sm:block">
                  {t("preverjeni.primer.posnetek", { n })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="text-xs text-slate-400">
        {t("preverjeni.primer.oznaka")}
      </figcaption>
    </figure>
  );
}
