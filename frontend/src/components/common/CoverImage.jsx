import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

const PRESETS = {
  cover: 'c_fill,w_600,h_900,f_auto,q_auto',
  thumb: 'c_fill,w_200,h_300,f_auto,q_auto',
  avatar: 'c_fill,w_256,h_256,g_face,f_auto,q_auto',
};

const defaultCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'n7j7nivw';

/**
 * Builds a Cloudinary transformation URL from a publicId and preset.
 */
export const coverUrl = (publicId, preset = 'thumb', cloudName = defaultCloudName) => {
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
  accent = '#1C1917',
  className = '',
  aspectRatio = 'aspect-[2/3]',
}) {
  const [hasError, setHasError] = useState(false);

  // If a direct URL is given and valid, use it; otherwise build Cloudinary URL
  const resolvedUrl = url || (publicId ? coverUrl(publicId, preset) : '');

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`relative ${aspectRatio} rounded border border-rule bg-paper overflow-hidden flex flex-col justify-between p-3 select-none text-ink ${className}`}
        role="img"
        aria-label={`Cover for ${title}`}
      >
        <div className="flex justify-between items-start text-muted">
          <BookOpen className="w-4 h-4" />
        </div>

        <div className="my-auto text-center px-1">
          <p className="font-bold text-xs md:text-sm line-clamp-3 leading-tight text-ink">
            {title}
          </p>
        </div>

        <div className="border-t border-rule w-6 mx-auto" />
      </div>
    );
  }

  return (
    <div
      className={`relative ${aspectRatio} rounded border border-rule overflow-hidden bg-paper ${className}`}
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


