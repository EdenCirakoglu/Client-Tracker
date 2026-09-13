import { AccountForm } from '../../components/account-form';
import { ProtectedPage } from '../../components/app-shell';
export default function Page() {
  return (
    <ProtectedPage>
      <AccountForm mode="change" />
    </ProtectedPage>
  );
}
