import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="w-full aspect-[2/3] rounded-lg" />
      <Skeleton className="w-3/4 h-4 rounded" />
      <Skeleton className="w-1/2 h-3 rounded" />
      <div className="flex justify-between mt-1">
        <Skeleton className="w-14 h-3 rounded" />
        <Skeleton className="w-10 h-3 rounded" />
      </div>
    </div>
  );
}

export default Skeleton;
