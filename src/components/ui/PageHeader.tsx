export function PageHeader({ title }: { title: string }) {
  return (
    <h1 className="truncate font-serif text-xl tracking-tight text-[color:var(--color-ink)] md:text-[28px]">
      {title}
    </h1>
  );
}
