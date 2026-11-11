import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './index';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry auth / permission / not-found errors: retrying won't fix them.
      retry: (count, err) =>
        !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
