import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from '../../components/common/Logo';
import { APP_NAME } from '../../constants/app';
import { PenLine, BookOpen, Sparkles } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: PenLine,
    title: 'Write & Publish',
    description: 'Distraction-free manuscript editing, chapter formatting, and instant distribution.',
  },
  {
    icon: BookOpen,
    title: 'Immersive Reader',
    description: 'Typographic reading experience with page persistence and scene markers.',
  },
  {
    icon: Sparkles,
    title: 'Literary Intelligence',
    description: 'On-demand narrative breakdowns, story arc mapping, and character continuity.',
  },
];

export default function AuthCollage({ heading = 'A home for your stories.' }) {
  const shouldReduceMotion = useReducedMotion();

  const cardVariants = {
    initial: { y: 0, opacity: 0.95 },
    animate: shouldReduceMotion
      ? { y: 0, opacity: 0.95 }
      : {
          y: [-4, 4, -4],
          transition: {
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
  };

  const secondaryCardVariants = {
    initial: { y: 0, opacity: 0.8 },
    animate: shouldReduceMotion
      ? { y: 0, opacity: 0.8 }
      : {
          y: [4, -4, 4],
          transition: {
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
  };

  return (
    <div className="w-full h-full min-h-[320px] md:min-h-[560px] bg-paper p-5 sm:p-6 md:p-8 flex flex-col justify-between rounded border border-rule select-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10">
        <div className="flex items-center mb-3">
          <Logo size="default" />
        </div>
        <p className="text-xs text-muted font-body leading-relaxed max-w-sm">
          Where immersive serial fiction, writer discovery, and publishing converge.
        </p>

        <h3 className="hidden md:block text-base font-bold text-ink leading-snug mt-6">
          {heading}
        </h3>
      </div>

      <div className="hidden md:flex flex-col gap-4 my-6 relative z-10">
        {HIGHLIGHTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-2.5 rounded border border-rule/60 bg-paper/60 backdrop-blur-xs transition-colors hover:border-rule"
            >
              <div className="p-2 rounded bg-rule/20 text-accent shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-ink">{item.title}</h4>
                <p className="text-[11px] text-muted font-body leading-snug mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block relative z-10 pt-2 border-t border-rule/50">
        <div className="relative h-28 flex items-center justify-center">
          <motion.div
            variants={secondaryCardVariants}
            initial="initial"
            animate="animate"
            className="absolute left-6 w-44 p-3 rounded border border-rule bg-paper shadow-xs rotate-[-3deg]"
          >
            <div className="h-1.5 w-12 bg-muted/30 rounded mb-1.5" />
            <div className="h-1 w-24 bg-muted/20 rounded" />
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="absolute right-6 w-48 p-3 rounded border border-accent/40 bg-paper shadow-sm rotate-[2deg]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-accent">
                {APP_NAME} Original
              </span>
            </div>
            <div className="h-1.5 w-28 bg-ink/80 rounded mb-1.5" />
            <div className="h-1 w-20 bg-muted/30 rounded" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export { AuthCollage };
