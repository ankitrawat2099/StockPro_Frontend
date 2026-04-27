export default function StatCard({ label, value, helper, tone = "default" }) {
  return (
    <div className={`panel-soft p-5 ${
      tone === "coral" ? "bg-coral text-white" :
      tone === "mint" ? "bg-mint/30" :
      tone === "ink" ? "bg-ink-950 text-white" :
      "bg-white"
    }`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{label}</p>
      <h3 className="mt-3 text-3xl">{value}</h3>
      {helper ? <p className="mt-2 text-sm opacity-80">{helper}</p> : null}
    </div>
  );
}
