export function PageHeader({ title }: { title: string }) {
  return (
    <h1 className="font-serif text-2xl md:text-[28px] tracking-tight text-[color:var(--color-ink)]">
      {title}
    </h1>
  );
}
