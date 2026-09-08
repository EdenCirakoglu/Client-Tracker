import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const variants = {
  primary: 'border-brand-700 bg-brand-700 text-white hover:bg-brand-600',
  secondary: 'border-border bg-white text-ink hover:bg-slate-50',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'border-red-700 bg-red-700 text-white hover:bg-red-600',
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
