// Zastava države kot slika. Emoji zastavic Windows ne izriše (pokaže le
// črki "SI"), zato so zastave SVG-ji v `src/assets/zastave/<koda>.svg`
// (iz paketa flag-icons, MIT). Nova država = nova datoteka; brez nje ostane
// značka s kodo.
const ZASTAVE = import.meta.glob<string>('../assets/zastave/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

function naslovZastave(koda: string): string | undefined {
  return ZASTAVE[`../assets/zastave/${koda.toLowerCase()}.svg`]
}

export default function Zastava({
  koda,
  className = 'h-3.5',
}: {
  koda: string
  /** Višina (širina sledi razmerju 4:3). */
  className?: string
}) {
  const src = naslovZastave(koda)
  if (!src)
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 shrink-0 items-center rounded bg-white/10 px-1 text-[10px] font-black tracking-wide text-slate-300"
      >
        {koda}
      </span>
    )
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`${className} aspect-[4/3] shrink-0 rounded-[3px] object-cover ring-1 ring-white/15`}
    />
  )
}
