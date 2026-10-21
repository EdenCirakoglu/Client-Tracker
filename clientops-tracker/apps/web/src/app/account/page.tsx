import { AccountForm } from '../../components/account-form';
import { ProtectedPage } from '../../components/app-shell';
import { NotificationPreferences } from '../../components/notification-preferences';
export default function Page() {
  return (
    <ProtectedPage>
      <AccountForm mode="change" />
      <NotificationPreferences />
    </ProtectedPage>
  );
}
