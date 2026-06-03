import { motion } from "framer-motion";

export function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] flex items-center gap-3"
    >
      <div className="h-9 w-9 rounded-lg bg-[color:var(--color-bg)] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-[color:var(--color-gold)]" />
      </div>
      <div>
        <p className="font-serif text-2xl text-[color:var(--color-ink)] leading-none">{value}</p>
        <p className="text-[11px] text-[color:var(--color-ink-dim)] mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}
