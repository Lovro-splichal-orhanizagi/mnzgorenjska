// Javna stran Preverjeni igralski profil (`/verified`): kaj preverjen profil
// prinese (tri uvrščene koristi), kako do njega in kaj je v tvojem primeru
// naslednji korak. Nakup je na strani igralca (`PreverjeniProfil`), tu je le
// en gumb nanj in ob njem obstoječi nizi s cenama. V aplikaciji ni ne cene ne
// gumba za nakup (Apple ne dovoli napotkov na plačila zunaj trgovine), kot
// drugod (`jeNativno()`). "V pripravi" je načrt, ne obljuba nakupa.
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

/**
 * Razdelek "V pripravi" (načrt, ne del nakupa). Ena konstanta: `false` ga
 * odstrani s strani, nizi `preverjeni.pripravi.*` pa lahko ostanejo.
 */
const V_PRIPRAVI = true;

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

  // Tri koristi po vrsti pomembnosti. Izbranost je le, ko je v bazi živa.
  const koristi = [
    {
      k: "kljukica",
      naslov: t("preverjeni.kaj.kljukica"),
      opis: t("preverjeni.kaj.kljukicaOpis"),
    },
    ...(izbranost
      ? [
          {
            k: "izbranost",
            naslov: t("preverjeni.kaj.izbranost"),
            opis: t("preverjeni.kaj.izbranostOpis"),
          },
        ]
      : []),
    {
      k: "posnetki",
      naslov: t("preverjeni.kaj.posnetki"),
      opis: t("preverjeni.kaj.posnetkiOpis"),
    },
  ];
  const koraki = [
    "poisci",
    "prevzemi",
    ...(ponudba ? (["izberi"] as const) : []),
    "uredi",
  ] as const;

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
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
          {ponudba && prodaja && <Cene />}
        </div>
        <PrimerProfila />
      </section>

      {stanje.vrsta !== "brezPonudbe" && (
        <section aria-labelledby="preverjeni-kaj" className="space-y-5">
          <h2 id="preverjeni-kaj" className="text-2xl font-black naslov">
            {t("preverjeni.kaj.naslov")}
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {koristi.map((k, n) => (
              <li
                key={k.k}
                className={`relative overflow-hidden rounded-2xl p-5 ${
                  n === 0
                    ? "bg-gradient-to-br from-sky-500/15 to-white/[0.03] ring-1 ring-sky-300/30"
                    : "bg-white/[0.04] ring-1 ring-white/10"
                }`}
              >
                <span
                  className="block text-5xl font-black leading-none text-gnl-500/60 naslov"
                  aria-hidden="true"
                >
                  {n + 1}
                </span>
                <h3 className="mt-3 flex items-start gap-2 text-lg font-black leading-snug text-slate-50">
                  {k.k === "kljukica" && (
                    <span className="mt-0.5 shrink-0">
                      <Kljukica velikost={22} />
                    </span>
                  )}
                  {k.naslov}
                </h3>
                <p className="mt-1.5 text-sm text-slate-300">{k.opis}</p>
              </li>
            ))}
          </ol>
          <p className="grid gap-1 text-sm text-slate-400 sm:grid-cols-2 sm:gap-6">
            <span className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {t("preverjeni.kaj.dodatno")}
            </span>
            <span>{t("preverjeni.kaj.profil")}</span>
            <span>{t("preverjeni.kaj.ogledi")}</span>
          </p>
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

      {V_PRIPRAVI && stanje.vrsta !== "brezPonudbe" && <VPripravi />}
    </div>
  );
}

/**
 * Cene ob glavnem gumbu: obstoječa niza iz nakupa, brez novega besedila o
 * podaljšanju ali pogojih. Pravo ceno in pogoje pokaže blagajna.
 */
function Cene() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {t("preverjeni.naslov")}
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold text-slate-50">
        <span>{t("igralci.preverjen.ponudba.letna")}</span>
        <span className="font-normal text-slate-500" aria-hidden="true">
          ·
        </span>
        <span>{t("igralci.preverjen.ponudba.dozivljenjska")}</span>
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
    </div>
  );
}

/**
 * Načrt, ne nakup: vidno označen, ločen od koristi in brez cene, roka ali
 * zagotovila. Instagram zgodbe so po privolitvi in po pregledu SLFF.
 */
function VPripravi() {
  return (
    <section
      aria-labelledby="preverjeni-pripravi"
      className="space-y-4 rounded-2xl border border-dashed border-white/20 bg-slate-900/40 p-5 sm:p-6"
    >
      <div className="space-y-1.5">
        <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-200">
          {t("preverjeni.pripravi.oznaka")}
        </p>
        <h2 id="preverjeni-pripravi" className="text-xl font-black naslov">
          {t("preverjeni.pripravi.naslov")}
        </h2>
        <p className="text-sm text-slate-400">
          {t("preverjeni.pripravi.uvod")}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {(["story", "igralci"] as const).map((k) => (
          <li key={k} className="space-y-1 border-l-2 border-white/15 pl-4">
            <h3 className="font-bold text-slate-100">
              {t(`preverjeni.pripravi.${k}.naslov`)}
            </h3>
            <p className="text-sm text-slate-300">
              {t(`preverjeni.pripravi.${k}.opis`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
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
 * Primer preverjenega profila: temno zeleno igrišče SLFF, velik portret
 * (silhueta, ne obraz), ista kljukica kot v izložbi in ploščica posnetka kot
 * v videoigralcu. Brez izmišljenih imen, ekip, števil, logov klubov ali blagovnih
 * znamk: slika je naše igrišče, grb naš, besedila so označena kot primer.
 */
function PrimerProfila() {
  return (
    <figure className="m-0 space-y-2">
      <div
        aria-hidden="true"
        className="izlozba izlozba-okvir overflow-hidden rounded-3xl"
        style={{ "--poudarek": "#34d399" } as CSSProperties}
      >
        {/* Igrišče: črte, krog in dva loka na temno zeleni podlagi. */}
        <div className="izlozba-pasica-privzeta relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pt-8">
          <svg
            viewBox="0 0 400 220"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full opacity-[0.18]"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <rect x="12" y="12" width="376" height="196" rx="4" />
            <path d="M200 12v196" />
            <circle cx="200" cy="110" r="38" />
            <path d="M12 62h52v96H12M388 62h-52v96h52" />
          </svg>
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="izlozba-foto relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-slate-700 to-slate-900 sm:h-32 sm:w-32">
              <svg
                viewBox="0 0 96 96"
                className="h-full w-full"
                fill="#94a3b8"
                fillOpacity="0.55"
              >
                <circle cx="48" cy="38" r="17" />
                <path d="M14 96c2-22 16-34 34-34s32 12 34 34z" />
              </svg>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="flex min-w-0 items-center gap-1.5 text-xl font-black text-white sm:text-2xl">
                <span className="truncate">{t("preverjeni.primer.ime")}</span>
                <Kljukica velikost={24} />
              </p>
              <p className="truncate text-sm text-slate-300">
                {t("preverjeni.primer.klub")}
              </p>
              <p className="line-clamp-2 text-xs text-slate-300 sm:text-sm">
                {t("preverjeni.primer.opis")}
              </p>
            </div>
          </div>
        </div>
        {/* Ploščica posnetka kot v izložbi: poster, gumb predvajaj, vrstica napredka. */}
        <div className="space-y-2 p-3 sm:p-4">
          <div className="relative aspect-video overflow-hidden rounded-xl">
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
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/30" />
            <span className="izlozba-gumb-predvajaj absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg viewBox="0 0 24 24" width="26" height="26">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            </span>
            <span className="absolute bottom-2.5 left-3 text-xs font-semibold text-white">
              {t("preverjeni.primer.posnetek", { n: 1 })}
            </span>
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
              <span className="block h-full w-1/3 bg-gnl-400" />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <div
                key={n}
                className="izlozba-poster relative flex aspect-video items-center justify-center rounded-lg"
              >
                <span className="izlozba-gumb-predvajaj !h-7 !w-7">
                  <svg viewBox="0 0 24 24" width="12" height="12">
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </span>
                <span className="absolute bottom-1 left-1.5 hidden text-[10px] font-semibold text-slate-200 sm:block">
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
