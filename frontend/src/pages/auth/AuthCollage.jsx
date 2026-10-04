import React from 'react';
import { BookOpen, Sparkles, Star } from 'lucide-react';

export default function AuthCollage({ heading = 'Discover worlds beyond imagination.' }) {
  return (
    <div className="relative w-full h-full min-h-[220px] md:min-h-[580px] bg-gradient-to-br from-[#FFF0E8] via-[#FFE5D6] to-[#FED7AA] p-6 md:p-10 flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[#FF500A]/10 select-none">
      {/* Decorative background shapes */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#FF500A]/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#FF500A] text-white flex items-center justify-center shadow-xs">
          <BookOpen className="w-4 h-4" />
        </div>
        <span className="font-serif font-extrabold text-xl text-[#121212]">SceneCraft</span>
      </div>

      {/* Center visual: overlapping mock covers */}
      <div className="relative z-10 my-auto py-6 flex items-center justify-center">
        {/* Cover 1 (Left tilt) */}
        <div className="w-28 sm:w-32 md:w-36 aspect-[2/3] rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 shadow-xl p-3 text-white flex flex-col justify-between transform -rotate-12 translate-x-4 hover:rotate-0 transition-transform duration-300">
          <span className="text-[10px] font-mono opacity-60">SCI-FI</span>
          <p className="font-serif font-bold text-xs line-clamp-2">The Starlight Cartographer</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-300">
            <Star className="w-2.5 h-2.5 fill-amber-300" /> 4.9
          </div>
        </div>

        {/* Cover 2 (Center main) */}
        <div className="w-32 sm:w-36 md:w-44 aspect-[2/3] rounded-xl bg-gradient-to-br from-[#FF500A] to-amber-600 shadow-2xl p-4 text-white flex flex-col justify-between z-20 hover:scale-105 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Fantasy
            </span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-serif font-extrabold text-sm md:text-base leading-tight drop-shadow-sm">
              Obsidian Crown
            </p>
            <p className="text-[11px] text-white/80 mt-1">by Elena Vance</p>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/20">
            <span>48.2K reads</span>
            <span className="font-bold">★ 4.8</span>
          </div>
        </div>

        {/* Cover 3 (Right tilt) */}
        <div className="w-28 sm:w-32 md:w-36 aspect-[2/3] rounded-xl bg-gradient-to-br from-purple-900 to-rose-950 shadow-xl p-3 text-white flex flex-col justify-between transform rotate-12 -translate-x-4 hover:rotate-0 transition-transform duration-300">
          <span className="text-[10px] font-mono opacity-60">ROMANCE</span>
          <p className="font-serif font-bold text-xs line-clamp-2">Lavender Room</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-300">
            <Star className="w-2.5 h-2.5 fill-amber-300" /> 4.9
          </div>
        </div>
      </div>

      {/* Bottom text */}
      <div className="relative z-10 hidden sm:block">
        <h3 className="font-serif font-bold text-lg md:text-xl text-[#121212] leading-snug">
          {heading}
        </h3>
        <p className="text-xs text-[#6B6B6B] mt-1">
          Join thousands of readers, writers, and publishers on the platform.
        </p>
      </div>
    </div>
  );
}

export { AuthCollage };

