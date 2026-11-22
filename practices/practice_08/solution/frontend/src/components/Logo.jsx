export default function Logo({ compact = false }) {
  return <div className="flex items-center gap-3">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-sm font-black text-ink shadow-glow">N</div>
    {!compact && <div><div className="text-sm font-bold tracking-[.18em]">NOVA</div><div className="text-[10px] tracking-[.28em] text-muted">EXCHANGE</div></div>}
  </div>;
}
