import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '../src/store';

export default function Index() {
  const { role, isLoggedIn } = useAppStore();

  if (!isLoggedIn) {
    return <Redirect href="/(salesman)/login" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(admin)/(tabs)" />;
  }

  return <Redirect href="/(salesman)/(tabs)" />;
}

