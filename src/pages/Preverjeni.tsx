// Javna stran Preverjeni igralski profil (`/verified`): kaj preverjen profil
// prinese, kako do njega in kaj je v tvojem primeru naslednji korak. Nakup je
// na strani igralca (`PreverjeniProfil`), tu je le en gumb nanj. V aplikaciji
// ni ne cene ne gumba za nakup (Apple ne dovoli napotkov na plačila zunaj
// trgovine), kot drugod (`jeNativno()`).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
// Napisna pisava le za to stran (latinica, latin-ext in cirilica; ostalo serif).
import "@fontsource-variable/playfair-display";
import { Link } from "../components/Povezava";
import { Kljukica } from "../components/ZnakPreverjen";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useNaslov } from "../lib/naslov";
import { izbranostJeZivo } from "../lib/izbranost";
import { jeNativno } from "../lib/platforma";
import { jeMladinskiSlug } from "../lib/prevzem";
import { useTekmovanje, zLigo } from "../lib/tekmovanje";
import { narisiPlakat, narisiSezono, narisiZgodboTekme } from "../lib/zgodbe";
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

/** Skupine koristi: kako se pokažeš, kako se pripraviš in kaj deliš. */
const STEBRI = {
  pokazi: ["kljukica", "posnetki", "highlight", "vzdevek", "profil", "izpostavljeno", "sporocilo"],
  pripravi: ["predTekmo", "sporocila", "ogledi", "izbranost"],
  deli: ["zgodbe", "sezona", "cv", "plakat"],
} as const;
type Korist = (typeof STEBRI)[keyof typeof STEBRI][number];

/** Vrstice primerjave: prvi dve ima vsak potrjen igralec, ostale le preverjeni. */
const PRIMERJAVA = ["kljukica", "posnetki", "highlight", "profil", "sporocila", "predTekmo", "zgodbe", "sezona", "cv", "plakat"] as const;

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
  // Plakat je del doživljenjskega nakupa: le kjer je nakup odprt (ne v aplikaciji).
  const ima = (k: Korist) =>
    (k !== "plakat" || !!ponudba) && (k !== "izbranost" || izbranost);
  const koraki = [
    "poisci",
    "prevzemi",
    ...(ponudba ? (["izberi"] as const) : []),
    "uredi",
  ] as const;
  // Cena ob glavnem gumbu: le kjer je nakup odprt in obiskovalec še ni preverjen.
  const cena = prodaja && ponudba;
  const kupuje = stanje.vrsta === "poisci" || stanje.vrsta === "kupi";
  const predogledi = usePredogledi(!!ponudba);
  const ponudbaVidna = stanje.vrsta !== "brezPonudbe";

  return (
    <div className="preverjeni-stran space-y-16 pb-24 sm:space-y-24 sm:pb-0">
      {/* Vrh: obljuba, cena in prava zgodba po tekmi v telefonu. */}
      <section className="preverjeni-vrh relative -mx-4 grid items-center gap-10 overflow-hidden px-4 pb-10 pt-10 sm:mx-0 sm:rounded-[2rem] sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="relative space-y-6">
          <p className="preverjeni-oznaka inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
            <Kljukica velikost={16} />
            {t("preverjeni.naslov")}
          </p>
          <h1 className="pisava-prestiz text-[2.6rem] font-semibold leading-[1.02] text-white sm:text-6xl">
            {t("preverjeni.glava")}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {t("preverjeni.uvod")}
          </p>
          {cena && (
            <div className="space-y-1">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="preverjeni-zlati-napis pisava-prestiz text-4xl font-bold sm:text-5xl">
                  {t("igralci.preverjen.ponudba.letna")}
                </span>
                <span className="text-base text-slate-300">
                  {t("preverjeni.cena.ali", {
                    cena: t("igralci.preverjen.ponudba.dozivljenjska"),
                  })}
                </span>
              </p>
              <p className="text-sm font-semibold text-amber-100/80">
                {t("preverjeni.cena.mesecno")}
              </p>
            </div>
          )}
          <Cta stanje={stanje} />
          {ponudbaVidna && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs font-semibold text-slate-300">
              {(["zapisniki", ...(cena ? (["stripe", "preklic"] as const) : [])] as const).map((k) => (
                <li key={k} className="inline-flex items-center gap-1.5">
                  <Kvacica />
                  {t(`preverjeni.zaupanje.${k}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Telefon slika={predogledi.zgodba} />
      </section>

      {ponudbaVidna && (
        <section className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/80">
            SLFF
          </p>
          <h2 className="pisava-prestiz text-3xl font-semibold text-white sm:text-4xl">
            {t("preverjeni.nizje.naslov")}
          </h2>
          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            {t("preverjeni.nizje.besedilo")}
          </p>
        </section>
      )}

      {/* Izložba: kar res dobiš, izrisano z istimi funkcijami kot na profilu. */}
      {ponudbaVidna && (
        <section aria-labelledby="preverjeni-izlozba" className="space-y-8">
          <Naslov id="preverjeni-izlozba" naslov={t("preverjeni.izlozba.naslov")} opis={t("preverjeni.izlozba.opis")} />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Izdelek naslov={t("preverjeni.kaj.naslovi.highlight")} opis={t("preverjeni.kaj.highlight")}>
              <HighlightPrimer />
            </Izdelek>
            {ponudba && (
              <Izdelek naslov={t("preverjeni.kaj.naslovi.plakat")} opis={t("preverjeni.kaj.plakat")} zlato>
                <div className="preverjeni-stena flex aspect-[4/5] items-center justify-center rounded-2xl p-6">
                  <Slika src={predogledi.plakat} razmerje="2/3" className="preverjeni-okvir h-full" />
                </div>
              </Izdelek>
            )}
            <Izdelek naslov={t("preverjeni.kaj.naslovi.sezona")} opis={t("preverjeni.kaj.sezona")}>
              <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-slate-950/60 p-6">
                <Slika src={predogledi.sezona} razmerje="9/16" className="h-full rounded-xl shadow-2xl" />
              </div>
            </Izdelek>
            {!ponudba && (
              <Izdelek naslov={t("preverjeni.kaj.naslovi.profil")} opis={t("preverjeni.kaj.profil")}>
                <PrimerProfila />
              </Izdelek>
            )}
          </div>
          <p className="text-center text-xs text-slate-400">{t("preverjeni.izlozba.primer")}</p>
        </section>
      )}

      {/* Vse koristi v treh stebrih. */}
      {ponudbaVidna && (
        <section aria-labelledby="preverjeni-kaj" className="space-y-8">
          <Naslov id="preverjeni-kaj" naslov={t("preverjeni.stebri.naslov")} />
          <div className="grid gap-5 lg:grid-cols-3">
            {(Object.keys(STEBRI) as Array<keyof typeof STEBRI>).map((s, i) => (
              <div key={s} className="preverjeni-steber rounded-3xl p-6">
                <p className="pisava-prestiz text-5xl font-semibold text-amber-200/30">0{i + 1}</p>
                <h3 className="pisava-prestiz mt-2 text-2xl font-semibold text-white">
                  {t(`preverjeni.stebri.${s}`)}
                </h3>
                <ul className="mt-5 space-y-4">
                  {STEBRI[s].filter(ima).map((k) => (
                    <li key={k} className="flex gap-3">
                      <span className="mt-0.5 shrink-0">
                        {k === "kljukica" ? <Kljukica velikost={18} /> : <Kvacica />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-100">{t(`preverjeni.kaj.naslovi.${k}`)}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{t(`preverjeni.kaj.${k}`)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Brezplačno ali preverjeno. */}
      {ponudbaVidna && (
        <section aria-labelledby="preverjeni-primerjava" className="mx-auto max-w-3xl space-y-8">
          <Naslov id="preverjeni-primerjava" naslov={t("preverjeni.primerjava.naslov")} />
          <div className="preverjeni-steber overflow-hidden rounded-3xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="p-4 font-semibold text-slate-400">{t("preverjeni.primerjava.korist")}</th>
                  <th scope="col" className="w-24 p-4 text-center font-semibold text-slate-400 sm:w-32">{t("preverjeni.primerjava.brezplacno")}</th>
                  <th scope="col" className="preverjeni-stolpec w-28 p-4 text-center font-bold text-amber-100 sm:w-36">
                    <span className="inline-flex items-center gap-1.5"><Kljukica velikost={14} />{t("preverjeni.primerjava.preverjen")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(["prevzem", "statistika"] as const).map((k) => (
                  <tr key={k} className="border-b border-white/5">
                    <th scope="row" className="p-4 font-medium text-slate-200">{t(`preverjeni.primerjava.${k}`)}</th>
                    <td className="p-4 text-center"><Kvacica oznaka={t("preverjeni.primerjava.da")} /></td>
                    <td className="preverjeni-stolpec p-4 text-center"><Kvacica oznaka={t("preverjeni.primerjava.da")} /></td>
                  </tr>
                ))}
                {PRIMERJAVA.filter(ima).map((k) => (
                  <tr key={k} className="border-b border-white/5 last:border-0">
                    <th scope="row" className="p-4 font-medium text-slate-200">{t(`preverjeni.kaj.naslovi.${k}`)}</th>
                    <td className="p-4 text-center text-slate-600" aria-label={t("preverjeni.primerjava.ne")}>–</td>
                    <td className="preverjeni-stolpec p-4 text-center">
                      {k === "plakat" ? (
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-200">{t("preverjeni.cena.zaVedno")}</span>
                      ) : (
                        <Kvacica oznaka={t("preverjeni.primerjava.da")} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cena. */}
      {cena && (
        <section aria-labelledby="preverjeni-cena" className="mx-auto max-w-4xl space-y-8">
          <Naslov id="preverjeni-cena" naslov={t("preverjeni.cena.naslov")} />
          <div className="grid items-stretch gap-5 md:grid-cols-2">
            <div className="preverjeni-steber flex flex-col rounded-3xl p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t("preverjeni.cena.letna")}</p>
              <p className="pisava-prestiz mt-3 text-4xl font-bold text-white">{t("igralci.preverjen.ponudba.letna")}</p>
              <p className="mt-1 text-sm font-semibold text-amber-100/80">{t("preverjeni.cena.mesecno")}</p>
              <p className="mt-4 text-sm text-slate-300">{t("preverjeni.cena.letnaOpis")}</p>
              <SeznamCene koristi={["kljukica", "posnetki", "highlight", "predTekmo", "zgodbe", "cv"]} />
            </div>
            <div className="preverjeni-zlata-kartica relative flex flex-col rounded-3xl p-7">
              <span className="izlozba izlozba-zlato absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                {t("preverjeni.cena.najugodneje")}
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{t("preverjeni.cena.zaVedno")}</p>
              <p className="preverjeni-zlati-napis pisava-prestiz mt-3 text-4xl font-bold">{t("igralci.preverjen.ponudba.dozivljenjska")}</p>
              <p className="mt-1 text-sm font-semibold text-amber-100/80">{t("preverjeni.cena.zaVednoOpis")}</p>
              <SeznamCene koristi={["plakat", "kljukica", "posnetki", "highlight", "predTekmo", "zgodbe", "cv"]} zlato />
            </div>
          </div>
          {kupuje && (
            <div className="flex justify-center">
              <Cta stanje={stanje} />
            </div>
          )}
          <div className="space-y-2 text-center">
            <p className="text-sm text-slate-300">{t("igralci.izlozba.ponudba.opomba")}</p>
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
        </section>
      )}

      {prodaja && (
        <section aria-labelledby="preverjeni-koraki" className="mx-auto max-w-4xl space-y-8">
          <Naslov id="preverjeni-koraki" naslov={t("preverjeni.koraki.naslov")} />
          <ol className={`grid gap-4 sm:grid-cols-2 ${koraki.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {koraki.map((k, n) => (
              <li key={k} className="preverjeni-steber rounded-3xl p-5">
                <span className="pisava-prestiz text-3xl font-semibold text-amber-200" aria-hidden="true">
                  {n + 1}
                </span>
                <h3 className="mt-2 font-bold text-slate-100">{t(`preverjeni.koraki.${k}.naslov`)}</h3>
                <p className="mt-1 text-sm text-slate-400">{t(`preverjeni.koraki.${k}.opis`)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Vprašanja: Scout, Evropa (kmalu), preklic, plakat, highlight, kdo lahko kupi. */}
      {ponudbaVidna && (
        <section aria-labelledby="preverjeni-vprasanja" className="mx-auto max-w-3xl space-y-8">
          <Naslov id="preverjeni-vprasanja" naslov={t("preverjeni.vprasanja.naslov")} />
          <div className="divide-y divide-white/10 border-y border-white/10">
            <Vprasanje v={t("preverjeni.scout.naslov")}>
              <p>{t("preverjeni.scout.opis")}</p>
              <p>{t("preverjeni.scout.ogledi")}</p>
              <a href="/legal#scout" className="inline-flex min-h-11 items-center text-sky-300 underline">
                {t("preverjeni.scout.vec")}
              </a>
            </Vprasanje>
            <Vprasanje v={t("preverjeni.vprasanja.evropa")}>
              <p>
                <span className="mr-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  {t("preverjeni.prihaja.oznaka")}
                </span>
                {t("preverjeni.prihaja.evropa.opis")}
              </p>
            </Vprasanje>
            <Vprasanje v={t("preverjeni.vprasanja.highlight.v")}>
              <p>{t("preverjeni.vprasanja.highlight.o")}</p>
            </Vprasanje>
            {ponudba && (
              <Vprasanje v={t("preverjeni.vprasanja.plakat.v")}>
                <p>{t("preverjeni.vprasanja.plakat.o")}</p>
              </Vprasanje>
            )}
            {ponudba && (
              <Vprasanje v={t("preverjeni.vprasanja.preklic.v")}>
                <p>{t("preverjeni.vprasanja.preklic.o")}</p>
              </Vprasanje>
            )}
            <Vprasanje v={t("preverjeni.vprasanja.kdo")}>
              <p>{t("preverjeni.cta.brezPonudbe")}</p>
            </Vprasanje>
          </div>
        </section>
      )}

      {/* Zaključek. */}
      {prodaja && (
        <section className="preverjeni-vrh relative -mx-4 overflow-hidden px-4 py-14 text-center sm:mx-0 sm:rounded-[2rem]">
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="pisava-prestiz text-4xl font-semibold text-white sm:text-5xl">{t("preverjeni.konec.naslov")}</h2>
            <p className="text-base text-slate-300 sm:text-lg">{t("preverjeni.konec.besedilo")}</p>
            <div className="flex justify-center">
              <Cta stanje={stanje} />
            </div>
          </div>
        </section>
      )}

      {/* Lepljiv gumb na telefonu: cena in nakup sta vedno pri roki. */}
      {cena && kupuje && <LepljivGumb stanje={stanje} />}
    </div>
  );
}

function Naslov({ id, naslov, opis }: { id: string; naslov: string; opis?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <span className="preverjeni-crta mx-auto block h-px w-16" aria-hidden="true" />
      <h2 id={id} className="pisava-prestiz text-3xl font-semibold text-white sm:text-4xl">
        {naslov}
      </h2>
      {opis && <p className="text-base text-slate-300">{opis}</p>}
    </div>
  );
}

/** Zlata kljukica v krogu (vključeno). */
function Kvacica({ oznaka }: { oznaka?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      className="inline-block shrink-0"
      role={oznaka ? "img" : undefined}
      aria-label={oznaka}
      aria-hidden={oznaka ? undefined : true}
    >
      <circle cx="10" cy="10" r="10" fill="rgba(247,220,140,0.16)" />
      <path d="M6 10.3l2.6 2.6L14.2 7.3" fill="none" stroke="#f7dc8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Izdelek({ naslov, opis, zlato = false, children }: { naslov: string; opis: string; zlato?: boolean; children: ReactNode }) {
  return (
    <figure className={`m-0 flex flex-col gap-4 rounded-3xl p-4 ${zlato ? "preverjeni-zlata-kartica" : "preverjeni-steber"}`}>
      {children}
      <figcaption className="space-y-1 px-2 pb-2">
        <p className="pisava-prestiz text-xl font-semibold text-white">{naslov}</p>
        <p className="text-sm leading-relaxed text-slate-400">{opis}</p>
      </figcaption>
    </figure>
  );
}

/** Slika predogleda; do izrisa prazen okvir istih mer (stran ne skače). */
function Slika({ src, razmerje, className = "" }: { src: string | null; razmerje: string; className?: string }) {
  return (
    <div className={`overflow-hidden bg-white/5 ${className}`} style={{ aspectRatio: razmerje }}>
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

/** Telefon z zgodbo po tekmi, za njim nagnjen plakat sezone. */
function Telefon({ slika }: { slika: string | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[19rem] lg:max-w-[21rem]" aria-hidden="true">
      <div className="preverjeni-sij absolute -inset-10 rounded-full" />
      <div className="preverjeni-telefon relative rounded-[2.6rem] px-2.5 pb-2.5 pt-8">
        <div className="absolute left-1/2 top-2.5 h-3.5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <Slika src={slika} razmerje="9/16" className="rounded-[1.4rem] rounded-b-[2.1rem]" />
      </div>
      <p className="relative mt-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/70">
        {t("preverjeni.kaj.naslovi.zgodbe")}
      </p>
    </div>
  );
}

/** Highlight video: igrišče, gumb za predvajanje in 6/6 posnetkov. */
function HighlightPrimer() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-950/60 p-4 md:aspect-[4/5] md:justify-between">
      <div className="relative overflow-hidden rounded-xl">
        <picture>
          <source srcSet="/foto/igrisce.webp" type="image/webp" />
          <img src="/foto/igrisce.jpg" alt="" width={1200} height={400} className="aspect-video w-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <span className="izlozba-gumb-predvajaj absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        </span>
        <span className="absolute bottom-2 left-3 text-xs font-bold text-white">HIGHLIGHTS · 1:30</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="flex aspect-video items-center justify-center rounded-lg bg-white/5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
            {t("preverjeni.primer.posnetek", { n })}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-amber-100">{t("preverjeni.kaj.naslovi.posnetki")}</span>
          <span className="tabular-nums text-white">6/6</span>
        </div>
        <div className="h-1.5 rounded-full bg-amber-300" />
      </div>
    </div>
  );
}

function SeznamCene({ koristi, zlato = false }: { koristi: readonly Korist[]; zlato?: boolean }) {
  return (
    <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm">
      {koristi.map((k, i) => (
        <li key={k} className={`flex items-center gap-2.5 ${zlato && i === 0 ? "font-bold text-amber-100" : "text-slate-200"}`}>
          <Kvacica />
          {t(`preverjeni.kaj.naslovi.${k}`)}
        </li>
      ))}
      <li className="pl-7 text-slate-400">{t("preverjeni.cena.inVec")}</li>
    </ul>
  );
}

function Vprasanje({ v, children }: { v: string; children: ReactNode }) {
  return (
    <details className="group py-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
        {v}
        <span className="text-xl text-amber-200 transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="space-y-2 pb-5 text-sm leading-relaxed text-slate-300">{children}</div>
    </details>
  );
}

function LepljivGumb({ stanje }: { stanje: Stanje }) {
  const pot = stanje.vrsta === "kupi" ? stanje.pot : "/players";
  return (
    <div className="preverjeni-lepljiv fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 px-4 py-3 sm:hidden">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{t("igralci.preverjen.ponudba.letna")}</p>
        <p className="truncate text-xs text-amber-100/80">{t("preverjeni.cena.mesecno")}</p>
      </div>
      <Link to={pot} className="gumb-glavni preverjeni-gumb inline-flex min-h-11 shrink-0 items-center px-4 text-sm">
        {stanje.vrsta === "kupi" ? t("preverjeni.cta.preveri") : t("preverjeni.cta.poisci")}
      </Link>
    </div>
  );
}

/**
 * Predogledi z istimi funkcijami kot na profilu, s podatki primera v jeziku
 * obiskovalca: zgodba po tekmi, moja sezona in (kjer je nakup) plakat.
 */
function usePredogledi(plakat: boolean) {
  const [slike, setSlike] = useState<{ zgodba: string | null; sezona: string | null; plakat: string | null }>({
    zgodba: null,
    sezona: null,
    plakat: null,
  });
  useEffect(() => {
    let velja = true;
    const url: string[] = [];
    const ime = t("preverjeni.primer.zgled.ime");
    const klub = t("preverjeni.primer.zgled.klub");
    const nasprotnik = t("preverjeni.primer.zgled.nasprotnik");
    const liga = t("preverjeni.primer.zgled.liga");
    const nastavi = (k: keyof typeof slike) => (b: Blob | null) => {
      if (!b || !velja) return;
      const u = URL.createObjectURL(b);
      url.push(u);
      setSlike((s) => ({ ...s, [k]: u }));
    };
    void (async () => {
      await narisiZgodboTekme({
        tekma: 0, datum: "2026-10-18", krog: 9, liga, liga_slug: "", ime,
        domaci: klub, gostje: nasprotnik, domaci_logo: null, gostje_logo: null,
        hg: 3, ag: 1, doma: true, minute: 90, goli: 2, zacel: true, asistence: 1, tocke: 14,
      }).then(nastavi("zgodba"));
      await narisiSezono({
        preverjen: true, sezona: "2026/27", liga, ime, klub,
        tekme: 12, minute: 1034, goli: 9, asistence: 4, tocke: 96, mesto: 3, izbranost: 41, skavti: 7,
        najboljsa: { datum: "2026-10-18", tocke: 18, goli: 3, minute: 90, proti: nasprotnik, dani: 4, prejeti: 1 },
      }).then(nastavi("sezona"));
      if (plakat)
        await narisiPlakat(
          {
            ime, vzdevek: t("preverjeni.primer.zgled.vzdevek"), pozicija: t("preverjeni.primer.zgled.pozicija"),
            klub: { ime: klub, logo: null }, liga: { ime: liga },
            sezone: [
              { sezona: "2026/27", liga, klub, tekme: 12, minute: 1034, goli: 9, asistence: 4 },
              { sezona: "2025/26", liga, klub, tekme: 24, minute: 1980, goli: 14, asistence: 7 },
              { sezona: "2024/25", liga, klub, tekme: 21, minute: 1610, goli: 8, asistence: 5 },
            ],
          },
          0.5,
        ).then(nastavi("plakat"));
    })();
    return () => {
      velja = false;
      url.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [plakat]);
  return slike;
}

/** Eden glavni gumb, odvisen od tega, kje je obiskovalec. */
function Cta({ stanje }: { stanje: Stanje }) {
  const gumb =
    "gumb-glavni preverjeni-gumb inline-flex min-h-[3.25rem] items-center justify-center px-7 text-base";
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
    <figure className="relative m-0 space-y-2">
      <div
        aria-hidden="true"
        className="izlozba izlozba-okvir preverjeni-primer overflow-hidden rounded-2xl"
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
            {t("preverjeni.primer.highlighti")}
          </p>
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
