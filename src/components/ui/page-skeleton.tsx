import { Skeleton } from "@/components/ui/skeleton";

export function TablePageSkeleton({
  rows = 5,
  cols = 4,
  hasHeader = true,
}: {
  rows?: number;
  cols?: number;
  hasHeader?: boolean;
}) {
  return (
    <div className="space-y-6">
      {hasHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      )}
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="p-4 border-b border-slate-50 last:border-0 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, col) => (
              <Skeleton key={col} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
  cols = 3,
  hasHeader = true,
}: {
  cards?: number;
  cols?: number;
  hasHeader?: boolean;
}) {
  return (
    <div className="space-y-6">
      {hasHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      )}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <Skeleton className="w-full aspect-[4/3]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="p-4 pt-0 space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton({ sections = 4 }: { sections?: number }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-3/4" />
          {i % 2 === 0 && <Skeleton className="h-4 w-1/2" />}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({
  stats = 3,
  hasTable = true,
}: {
  stats?: number;
  hasTable?: boolean;
}) {
  return (
    <div className="space-y-8">
      {}
      <Skeleton className="h-36 w-full rounded-2xl" />
      {}
      <div className={`grid gap-5 grid-cols-1 md:grid-cols-${stats}`}>
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {}
      {hasTable && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <Skeleton className="h-5 w-40" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-slate-50 last:border-0 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

