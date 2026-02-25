// Design tokens and constants

export const SPACING = {
  section: 'p-5',
  card: 'p-3',
  modal: 'p-6',
  field: 'mb-4',
} as const;

export const ROUNDED = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
} as const;

export const BORDERS = {
  default: 'border-neutral-800',
  focus: 'focus:border-[#bfa76f]',
} as const;

export const BACKGROUNDS = {
  section: 'bg-black/30',
  modal: 'bg-neutral-950',
  input: 'bg-black/60',
  overlay: 'bg-black/60',
} as const;

export const TEXT_COLORS = {
  primary: 'text-neutral-100',
  secondary: 'text-neutral-400',
  placeholder: 'placeholder:text-neutral-500',
} as const;
