import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-paper border border-rule rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2 border border-rule rounded bg-paper">
      <Skeleton className="w-full aspect-[2/3]" />
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-1/2 h-3" />
      <div className="flex justify-between mt-1">
        <Skeleton className="w-14 h-3" />
        <Skeleton className="w-10 h-3" />
      </div>
    </div>
  );
}

export default Skeleton;

