import type { JSX } from 'react';
import { Button } from '@base-ui/react/button';
import type { LucideIcon } from 'lucide-react';

export type TextButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'quiet';
  /** Tooltip, for short labels. */
  title?: string;
  wide?: boolean;
  /** Drawn before the label. */
  icon?: LucideIcon;
  /** Spins the icon, for work in progress. */
  spin?: boolean;
};

const BASE =
  'flex shrink-0 items-center justify-center gap-1.5 font-mono uppercase tracking-wide select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed';

const VARIANTS = {
  default: 'h-8 border border-line bg-bg px-3 text-2xs text-fg hover:bg-subtle disabled:text-muted disabled:hover:bg-bg',
  primary: 'h-12 border border-line bg-fg px-4 text-sm text-bg hover:bg-[#262626] disabled:bg-subtle disabled:text-muted',
  /** Same height as primary, to sit next to it. */
  secondary: 'h-12 border border-line bg-bg px-4 text-sm text-fg hover:bg-subtle disabled:text-muted disabled:hover:bg-bg',
  quiet: 'h-6 px-1 text-2xs text-muted hover:text-fg disabled:opacity-40',
};

export const TextButton = (props: TextButtonProps): JSX.Element => (
  <Button
    onClick={(): void => props.onClick()}
    disabled={props.disabled ?? false}
    title={props.title}
    className={`${BASE} ${VARIANTS[props.variant ?? 'default']} ${props.wide ? 'w-full' : ''}`}
  >
    {props.icon && <props.icon aria-hidden size={props.variant === 'primary' || props.variant === 'secondary' ? 16 : 14} strokeWidth={1.5} className={props.spin ? 'animate-spin' : ''} />}
    {props.label}
  </Button>
);
