import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30 секунд
      retry: (failureCount, error: any) => {
        // Не повторяем запросы для 4xx ошибок (кроме 408 - timeout)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
          return false;
        }
        // Повторяем максимум 1 раз для других ошибок
        return failureCount < 1;
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Не повторяем мутации для 4xx ошибок
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Повторяем максимум 1 раз для других ошибок
        return failureCount < 1;
      },
    },
  },
});