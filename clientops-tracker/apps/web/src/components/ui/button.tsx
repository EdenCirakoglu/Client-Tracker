import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const variants = {
  primary: 'border-action bg-action text-white hover:brightness-110',
  secondary: 'border-border bg-panel text-ink hover:bg-slate-50',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'border-red-700 bg-red-50 text-red-700 hover:bg-slate-100',
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
