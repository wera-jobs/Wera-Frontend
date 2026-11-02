import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '../api/profile';
import { Boot } from '../components/Boot';
import { ErrorState } from '../components/States';

/** Sends users without a complete profile to the setup wizard. */
export function RequireProfile() {
  const profile = useProfile();
  if (profile.isLoading) return <Boot />;
  if (!profile.data) {
    return (
      <div className="mx-auto max-w-md p-6 pt-24">
        <ErrorState message="Couldn't load your profile. Retrying by itself." onRetry={() => void profile.refetch()} />
      </div>
    );
  }
  if (!profile.data.ready) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}
