import { Redirect } from 'expo-router';
import { useAppStore } from '../src/store';

// Entry point: send the user to login or to their role's home.
export default function Index() {
  const { role, isLoggedIn } = useAppStore();

  if (!isLoggedIn) return <Redirect href="/login" />;
  if (role === 'admin') return <Redirect href="/(admin)/(tabs)" />;
  return <Redirect href="/(salesman)/(tabs)" />;
}
