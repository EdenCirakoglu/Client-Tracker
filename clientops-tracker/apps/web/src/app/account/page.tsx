'use client';
import { useState } from 'react';
import { AccountForm } from '../../components/account-form';
import { ProtectedPage } from '../../components/app-shell';
import { NotificationPreferences } from '../../components/notification-preferences';
export default function Page() {
  const [sessionEnded, setSessionEnded] = useState(false);
  return (
    <ProtectedPage>
      <AccountForm mode="change" onPasswordChanged={() => setSessionEnded(true)} />
      {!sessionEnded ? <NotificationPreferences /> : null}
    </ProtectedPage>
  );
}
