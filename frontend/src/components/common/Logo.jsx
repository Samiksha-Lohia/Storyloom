import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { APP_NAME } from '../../constants/app';

export default function Logo({ size = 'default', showText = true, className = '' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconSizeClass = isLarge ? 'w-10 h-10' : isSmall ? 'w-6 h-6' : 'w-8 h-8';
  const textSizeClass = isLarge ? 'text-2xl' : isSmall ? 'text-lg' : 'text-xl';

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 font-bold tracking-tight text-[#121212] group select-none ${className}`}
      aria-label={`${APP_NAME} Home`}
    >
      <div
        className={`flex items-center justify-center bg-[#FF500A] text-white rounded-xl shadow-sm transition-transform group-hover:scale-105 ${iconSizeClass}`}
      >
        <BookOpen className={isLarge ? 'w-6 h-6' : isSmall ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} />
      </div>
      {showText && (
        <span className={`font-serif tracking-tight font-extrabold ${textSizeClass}`}>
          {APP_NAME}
        </span>
      )}
    </Link>
  );
}

export { Logo };

