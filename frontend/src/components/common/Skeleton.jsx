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
    <div className="flex flex-col w-full h-full p-2.5 border border-rule rounded bg-paper">
      <Skeleton className="w-full aspect-[2/3] shrink-0" />
      <div className="flex flex-col mt-2.5 shrink-0 gap-1.5">
        <Skeleton className="w-4/5 h-4" />
        <Skeleton className="w-1/2 h-3" />
      </div>
      <div className="flex justify-between items-center pt-2 mt-auto border-t border-rule/50">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-10 h-3" />
      </div>
    </div>
  );
}

export default Skeleton;

