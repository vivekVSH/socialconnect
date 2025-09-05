export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-neutral-700 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
              <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
              <div className="h-3 bg-neutral-700 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts skeleton */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-700 rounded-full"></div>
              <div className="space-y-1 flex-1">
                <div className="h-3 bg-neutral-700 rounded w-1/4"></div>
                <div className="h-2 bg-neutral-700 rounded w-1/6"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-700 rounded w-full"></div>
              <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            </div>
            <div className="flex gap-4">
              <div className="h-3 bg-neutral-700 rounded w-16"></div>
              <div className="h-3 bg-neutral-700 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
