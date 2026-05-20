interface Props {
  title: string;
  message: string;
  compact?: boolean;
}

export default function PdpEmptyState({ title, message, compact = false }: Props) {
  return (
    <div
      className={
        compact
          ? 'rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center'
          : 'rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center'
      }
      role="status"
    >
      <p className="font-medium text-charcoal text-sm mb-1">{title}</p>
      <p className="text-xs text-charcoal-light leading-relaxed">{message}</p>
    </div>
  );
}
