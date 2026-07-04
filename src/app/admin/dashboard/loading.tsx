import { Skeleton } from "@/components/ui/skeleton";
export default function AdminDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-xl p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-xl p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex gap-3 items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

