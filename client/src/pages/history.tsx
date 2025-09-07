import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, RefreshCw } from 'lucide-react';
import { TimelineEventComponent } from '../components/timeline-event';
import { useProjectStore } from '../store/project-store';
import { useQuery } from '@tanstack/react-query';
import { getTimelineEvents } from '../lib/api';
import { useToast } from '../hooks/use-toast';

export default function HistoryPage() {
  const { toast } = useToast();
  const { exportTimelineCSV } = useProjectStore();

  const { 
    data: timelineEvents = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['timeline'],
    queryFn: getTimelineEvents,
  });

  if (isError) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              История изменений
            </h2>
            <p className="text-muted-foreground">
              Хронология событий и изменений в проекте
            </p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            Ошибка загрузки истории
          </h3>
          <p className="text-muted-foreground mb-4">
            Не удалось загрузить историю изменений
          </p>
          <Button 
            onClick={() => {
              refetch();
              toast({
                title: "Повторная попытка",
                description: "Пытаемся загрузить историю снова...",
              });
            }}
            variant="outline"
            className="font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              История изменений
            </h2>
            <p className="text-muted-foreground">
              Хронология событий и изменений в проекте
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex items-center space-x-4 mt-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            История изменений
          </h2>
          <p className="text-muted-foreground">
            Хронология событий и изменений в проекте
          </p>
        </div>
        <Button 
          onClick={() => exportTimelineCSV(timelineEvents)}
          data-testid="export-csv"
          className="font-medium"
        >
          <Download className="w-4 h-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>
      
      {timelineEvents.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            История пуста
          </h3>
          <p className="text-muted-foreground">
            События будут отображаться здесь по мере их возникновения
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {timelineEvents.map((event, index) => (
            <TimelineEventComponent 
              key={event.id} 
              event={event} 
              isLast={index === timelineEvents.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
