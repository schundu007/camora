interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 rounded-lg border border-gray-200 ${className}`}>
      <Skeleton className="h-4 w-1/3 mb-3" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function InterviewSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-4 gap-4 animate-fade-up">
      {/* Question skeleton */}
      <div className="flex items-start gap-2 p-3 rounded border border-gray-200/30">
        <Skeleton className="h-6 w-8 shrink-0" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* Answer block skeletons */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <SkeletonText lines={4} />
        <Skeleton className="h-5 w-32 mt-4" />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
