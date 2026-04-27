export default function PageHeader({ title, actions }) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-100 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
