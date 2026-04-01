import { motion } from 'framer-motion';

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Code skeleton */}
      <div className="space-y-2">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="h-5 bg-gray-200 dark:bg-gray-700 rounded"
            style={{ width: `${Math.random() * 40 + 40}%` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}

export function CodeSkeleton() {
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-4 space-y-2">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div
              className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              style={{ width: `${Math.random() * 50 + 30}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExplanationSkeleton() {
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
