import type { Metadata } from 'next';

import { AuthProvider } from '../lib/auth';
import { PreferencesProvider } from '../components/ui/preferences';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClientOps Tracker',
  description: 'Full-stack client operations tracking platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          <AuthProvider>{children}</AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
