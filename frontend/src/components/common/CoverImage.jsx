import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

const PRESETS = {
  cover: 'c_fill,w_600,h_900,f_auto,q_auto',
  thumb: 'c_fill,w_200,h_300,f_auto,q_auto',
  avatar: 'c_fill,w_256,h_256,g_face,f_auto,q_auto',
};

/**
 * Builds a Cloudinary transformation URL from a publicId and preset.
 */
export const coverUrl = (publicId, preset = 'thumb', cloudName = 'scenecraft') => {
  if (!publicId) return '';
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId;
  }
  const transformation = PRESETS[preset] || PRESETS.thumb;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
};

export default function CoverImage({
  publicId,
  url,
  title = 'Untitled Story',
  preset = 'thumb',
  accent = '#FF500A',
  className = '',
  aspectRatio = 'aspect-[2/3]',
}) {
  const [hasError, setHasError] = useState(false);

  // If a direct URL is given and valid, use it; otherwise build Cloudinary URL
  const resolvedUrl = url || (publicId ? coverUrl(publicId, preset) : '');

  if (!resolvedUrl || hasError) {
    // Generated cover placeholder: title on a tinted block (2:3 aspect ratio)
    return (
      <div
        className={`relative ${aspectRatio} rounded-lg overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between p-3.5 select-none text-white ${className}`}
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #121212 120%)`,
        }}
        role="img"
        aria-label={`Cover for ${title}`}
      >
        <div className="flex justify-between items-start opacity-70">
          <BookOpen className="w-4 h-4 text-white/80" />
          <span className="text-[10px] uppercase font-mono tracking-widest text-white/70">SC</span>
        </div>

        <div className="my-auto text-center px-1">
          <p className="font-serif font-bold text-sm md:text-base line-clamp-3 leading-tight drop-shadow-sm">
            {title}
          </p>
        </div>

        <div className="h-1 w-8 rounded-full bg-white/30 mx-auto" />
      </div>
    );
  }

  return (
    <div
      className={`relative ${aspectRatio} rounded-lg overflow-hidden bg-slate-100 shadow-xs hover:shadow-md transition-shadow ${className}`}
    >
      <img
        src={resolvedUrl}
        alt={`Cover for ${title}`}
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export { CoverImage };

