import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startRun, getRunStatus, type RunStatusResponse } from '../lib/api';

export type RunStatus = 'idle' | 'queued' | 'running' | 'ready' | 'errors';

interface UseRunCheckOptions {
  projectId: string;
  toolchain?: string;
  pollingInterval?: number;
}

export function useRunCheck({ 
  projectId, 
  toolchain = 'tests', 
  pollingInterval = 2500 
}: UseRunCheckOptions) {
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>('idle');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Мутация для запуска проверки
  const startRunMutation = useMutation({
    mutationFn: () => startRun(projectId, toolchain),
    onSuccess: (data) => {
      setCurrentRunId(data.runId);
      setStatus('queued');
      startPolling(data.runId);
    },
    onError: () => {
      setStatus('idle');
    },
  });

  // Запрос для получения статуса (используется в поллинге)
  const { data: runStatus } = useQuery({
    queryKey: ['runStatus', projectId, currentRunId],
    queryFn: () => getRunStatus(projectId, currentRunId!),
    enabled: !!currentRunId && (status === 'queued' || status === 'running'),
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });

  // Обработка изменения статуса
  useEffect(() => {
    if (runStatus) {
      const newStatus = runStatus.status === 'passed' ? 'ready' : runStatus.status;
      setStatus(newStatus as RunStatus);
      
      // Останавливаем поллинг, если прогон завершен
      if (newStatus === 'ready' || newStatus === 'errors') {
        stopPolling();
      }
    }
  }, [runStatus]);

  const startPolling = useCallback((runId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      // Поллинг происходит через useQuery с refetchInterval
    }, pollingInterval);
  }, [pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const runCheck = useCallback(() => {
    if (status === 'idle' || status === 'ready' || status === 'errors') {
      startRunMutation.mutate();
    }
  }, [status, startRunMutation]);

  const reset = useCallback(() => {
    stopPolling();
    setCurrentRunId(null);
    setStatus('idle');
  }, [stopPolling]);

  return {
    status,
    currentRunId,
    runCheck,
    reset,
    isLoading: startRunMutation.isPending,
    error: startRunMutation.error,
    durationMs: runStatus?.durationMs,
    reportId: runStatus?.reportId,
  };
}
