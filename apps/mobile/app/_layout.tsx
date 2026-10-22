import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth-context';
import { colors } from '../src/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
export default function RootLayout() {
  return <QueryClientProvider client={queryClient}><AuthProvider><StatusBar style="dark" backgroundColor={colors.bg} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} /></AuthProvider></QueryClientProvider>;
}
