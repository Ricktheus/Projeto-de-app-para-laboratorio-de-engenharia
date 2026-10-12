/** Shimmer placeholder for the Loading UI-state. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-concreto-100/80 ${className}`} />;
}

/** A stack of skeleton rows (list/table loading). */
export function SkeletonRows({
  rows = 4,
  className = 'h-14',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}
