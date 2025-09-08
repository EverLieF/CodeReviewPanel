import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Folder,
  Timer,
  Activity
} from 'lucide-react';
import { ProjectRun, Run } from '../lib/types';

interface RunsHistoryProps {
  projectRuns: ProjectRun[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

interface RunItemProps {
  run: Run;
  projectName: string;
}

function RunItem({ run, projectName }: RunItemProps) {
  const getStatusIcon = (status: Run['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4" />;
      case 'running':
        return <Activity className="w-4 h-4" />;
      case 'passed':
      case 'ready':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
      case 'errors':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Run['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'passed':
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
      case 'errors':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Run['status']) => {
    switch (status) {
      case 'queued':
        return 'В очереди';
      case 'running':
        return 'Выполняется';
      case 'passed':
        return 'Пройден';
      case 'ready':
        return 'Готов';
      case 'failed':
        return 'Не пройден';
      case 'errors':
        return 'Ошибки';
      default:
        return status;
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return null;
    if (durationMs < 1000) return `${durationMs}мс`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}с`;
    return `${(durationMs / 60000).toFixed(1)}м`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{projectName}</span>
          </div>
          <Badge variant="outline" className={`${getStatusColor(run.status)} flex items-center space-x-1`}>
            {getStatusIcon(run.status)}
            <span>{getStatusText(run.status)}</span>
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Play className="w-3 h-3" />
              <span>{run.toolchain}</span>
            </span>
            {run.durationMs && (
              <span className="flex items-center space-x-1">
                <Timer className="w-3 h-3" />
                <span>{formatDuration(run.durationMs)}</span>
              </span>
            )}
          </div>
          <span>{formatDate(run.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RunsHistory({ projectRuns, isLoading, isError, onRetry }: RunsHistoryProps) {
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>История прогонов</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-muted-foreground mb-4">
              Не удалось загрузить историю прогонов
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Повторить
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>История прогонов</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allRuns = projectRuns.flatMap(projectRun => 
    projectRun.runs.map(run => ({ run, projectName: projectRun.projectName }))
  ).sort((a, b) => new Date(b.run.createdAt).getTime() - new Date(a.run.createdAt).getTime());

  if (allRuns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>История прогонов</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              Нет прогонов
            </h3>
            <p className="text-muted-foreground">
              Прогоны будут отображаться здесь после запуска проверок
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>История прогонов</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {allRuns.map(({ run, projectName }) => (
            <RunItem 
              key={run.id} 
              run={run} 
              projectName={projectName}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
