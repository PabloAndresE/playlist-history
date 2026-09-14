export function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className ?? ""}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-1 rounded-xl border border-border-subtle p-4 flex items-center gap-4">
      <SkeletonBlock className="w-16 h-16 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-surface-1 rounded-xl border border-border-subtle p-4 space-y-2">
          <SkeletonBlock className="h-7 w-16 mx-auto" />
          <SkeletonBlock className="h-3 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-surface-1 rounded-xl border border-border-subtle p-6 space-y-4">
      <SkeletonBlock className="h-5 w-24" />
      <SkeletonBlock className="h-3 w-40" />
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <SkeletonStats />
      <SkeletonList rows={3} />
    </div>
  );
}
