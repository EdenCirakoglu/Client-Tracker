import { AccessDenied } from '../../components/access-denied';
import { ProtectedPage } from '../../components/app-shell';

export default function AccessDeniedPage() {
  return (
    <ProtectedPage>
      <AccessDenied />
    </ProtectedPage>
  );
}
