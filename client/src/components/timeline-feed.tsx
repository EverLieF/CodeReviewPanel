import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Upload, 
  Play, 
  CheckCircle, 
  FileText, 
  MessageCircle,
  Folder,
  Bot,
  Clock
} from 'lucide-react';
import { TimelineEventData } from '../lib/types';

interface TimelineFeedProps {
  events: TimelineEventData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

interface TimelineEventProps {
  event: TimelineEventData;
  isLast?: boolean;
}

function TimelineEventItem({ event, isLast }: TimelineEventProps) {
  const getEventIcon = (type: TimelineEventData['type']) => {
    switch (type) {
      case 'uploaded':
        return <Upload className="w-4 h-4" />;
      case 'run_started':
        return <Play className="w-4 h-4" />;
      case 'run_finished':
        return <CheckCircle className="w-4 h-4" />;
      case 'checks_ready':
        return <FileText className="w-4 h-4" />;
      case 'feedback_ready':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <Folder className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: TimelineEventData['type']) => {
    switch (type) {
      case 'uploaded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'run_started':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'run_finished':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'checks_ready':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'feedback_ready':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeText = (type: TimelineEventData['type']) => {
    switch (type) {
      case 'uploaded':
        return 'Загрузка';
      case 'run_started':
        return 'Запуск';
      case 'run_finished':
        return 'Завершение';
      case 'checks_ready':
        return 'Проверки';
      case 'feedback_ready':
        return 'Обратная связь';
      default:
        return type;
    }
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
    <div className="flex space-x-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
          {getEventIcon(event.type)}
        </div>
        {!isLast && <div className="w-0.5 h-16 bg-border mt-2" />}
      </div>
      
      <div className="flex-1 pb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={`${getEventColor(event.type)} text-xs`}>
                  {getEventTypeText(event.type)}
                </Badge>
                <Bot className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Система</span>
              </div>
              <span className="text-sm text-muted-foreground flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(event.createdAt)}</span>
              </span>
            </div>
            
            <p className="text-sm text-card-foreground mb-2">
              {event.message}
            </p>
            
            {event.details && Object.keys(event.details).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {event.details.toolchain && (
                  <span className="inline-block bg-muted px-2 py-1 rounded mr-2">
                    {event.details.toolchain}
                  </span>
                )}
                {event.details.durationMs && (
                  <span className="inline-block bg-muted px-2 py-1 rounded mr-2">
                    {(event.details.durationMs / 1000).toFixed(1)}с
                  </span>
                )}
                {event.details.source && (
                  <span className="inline-block bg-muted px-2 py-1 rounded mr-2">
                    {event.details.source}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TimelineFeed({ events, isLoading, isError, onRetry }: TimelineFeedProps) {
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Лента событий</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-muted-foreground mb-4">
              Не удалось загрузить ленту событий
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
            <Clock className="w-5 h-5" />
            <span>Лента событий</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Лента событий</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              Нет событий
            </h3>
            <p className="text-muted-foreground">
              События будут отображаться здесь по мере их возникновения
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
          <Clock className="w-5 h-5" />
          <span>Лента событий</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {events.map((event, index) => (
            <TimelineEventItem 
              key={event.id} 
              event={event} 
              isLast={index === events.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
