'use client';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

interface PreferencesProviderProps {
  children: React.ReactNode;
}
export function PreferencesProvider({ children }: PreferencesProviderProps) {
  return (
    <ThemeProvider
      storageKey="clientops:theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <fieldset className="flex items-center gap-1" aria-label="Appearance">
      <legend className="sr-only">Appearance</legend>
      {(
        [
          { value: 'light', label: 'Light', Icon: Sun },
          { value: 'dark', label: 'Dark', Icon: Moon },
          { value: 'system', label: 'System', Icon: Monitor },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} theme`}
          title={`${label} theme`}
          aria-pressed={mounted && theme === value}
          disabled={!mounted}
          onClick={() => setTheme(value)}
          className="grid h-10 w-10 place-items-center rounded-md text-muted hover:bg-slate-100 aria-pressed:bg-brand-50 aria-pressed:text-brand-700"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </fieldset>
  );
}
