// ─── Framer Motion Animation Presets ─────────────────────────────────────────

export const animations = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  },
  scaleOnHover: {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  },
  glowPulse: {
    animate: {
      boxShadow: [
        '0 0 20px rgba(59, 130, 246, 0.2)',
        '0 0 40px rgba(59, 130, 246, 0.4)',
        '0 0 20px rgba(59, 130, 246, 0.2)',
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  roadDraw: {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
} as const;

// ─── Accent Colors ───────────────────────────────────────────────────────────

export const accentColors = [
  { name: 'red', hex: '#EF4444', rgb: '239, 68, 68' },
  { name: 'cyan', hex: '#22D3EE', rgb: '34, 211, 238' },
  { name: 'blue', hex: '#3B82F6', rgb: '59, 130, 246' },
  { name: 'green', hex: '#10B981', rgb: '16, 185, 129' },
  { name: 'purple', hex: '#A855F7', rgb: '168, 85, 247' },
  { name: 'orange', hex: '#F97316', rgb: '249, 115, 22' },
  { name: 'pink', hex: '#EC4899', rgb: '236, 72, 153' },
] as const;

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ModuleType {
  MCQ = 1,
  VIDEO = 2,
  FILL_BLANK = 3,
  TEXT = 4,
}

export enum QuizType {
  MCQ = 1,
  TRUE_FALSE = 2,
  MATCHING = 3,
}
