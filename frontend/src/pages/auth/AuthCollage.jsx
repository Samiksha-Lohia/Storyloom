import React from 'react';
import { Logo } from '../../components/common/Logo';

export default function AuthCollage({ heading = 'A home for your stories.' }) {
  return (
    <div className="w-full h-full min-h-[80px] md:min-h-[480px] bg-paper p-4 md:p-8 flex flex-col justify-between rounded border border-rule select-none">
      {/* Top Header */}
      <div className="flex items-center">
        <Logo size="default" />
      </div>

      {/* Middle/Bottom text - plain, short sentences */}
      <div className="hidden md:block space-y-2 mt-8">
        <h3 className="text-sm font-bold text-ink leading-snug">
          {heading}
        </h3>
        <p className="text-xs text-muted leading-relaxed font-body">
          Read serialized fiction and publish your own manuscripts.
        </p>
      </div>
    </div>
  );
}

export { AuthCollage };
