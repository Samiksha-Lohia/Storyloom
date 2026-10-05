import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../constants/app';

export function StoryloomMark({ size = 28, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 17C26 13 17 13 9 16V49C17 46 26 46 32 50" />
        <path d="M32 17C38 13 47 13 55 16V49C47 46 38 46 32 50" />
        <path d="M32 17V50" />
      </g>
      <path
        d="M9 33C15 27 20 39 26 33S38 27 44 33S50 39 55 33"
        stroke="var(--color-accent, #9B2D20)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ showText = true, className = '', to = '/' }) {
  const content = (
    <span className={`inline-flex items-center gap-2 text-ink select-none ${className}`}>
      <StoryloomMark size={28} />
      {showText && (
        <span className="font-calligraphy text-[28px] leading-none text-ink font-normal">
          {APP_NAME}
        </span>
      )}
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} className="inline-flex items-center focus-visible:outline-none" aria-label={`${APP_NAME} Home`}>
      {content}
    </Link>
  );
}

export { Logo };
