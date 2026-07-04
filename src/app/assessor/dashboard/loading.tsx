import { Skeleton } from "@/components/ui/skeleton";
export default function AssessorDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-xl p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="border rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex gap-3 items-center py-2 border-b last:border-0"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

