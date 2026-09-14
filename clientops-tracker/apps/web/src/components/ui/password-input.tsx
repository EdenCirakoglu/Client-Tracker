'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  visibilityLabel: string;
}

export function PasswordInput({ visibilityLabel, className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={`pr-12 ${className}`} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted hover:text-ink"
        aria-label={`${visible ? 'Hide' : 'Show'} ${visibilityLabel}`}
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Eye aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
