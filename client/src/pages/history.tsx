import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw } from 'lucide-react';
import { TimelineEventComponent } from '../components/timeline-event';
import { RunsHistory } from '../components/runs-history';
import { TimelineFeed } from '../components/timeline-feed';
import { useProjectStore } from '../store/project-store';
import { useQuery } from '@tanstack/react-query';
import { getTimelineEvents, getTimelineEventsData, getAllRuns } from '../lib/api';
import { useToast } from '../hooks/use-toast';

export default function HistoryPage() {
  const { toast } = useToast();
  const { exportTimelineCSV } = useProjectStore();

  const { 
    data: timelineEvents = [], 
    isLoading: timelineLoading, 
    isError: timelineError, 
    refetch: refetchTimeline 
  } = useQuery({
    queryKey: ['timeline'],
    queryFn: getTimelineEvents,
  });

  const { 
    data: timelineEventsData = [], 
    isLoading: timelineDataLoading, 
    isError: timelineDataError, 
    refetch: refetchTimelineData 
  } = useQuery({
    queryKey: ['timeline-data'],
    queryFn: getTimelineEventsData,
  });

  const { 
    data: allRuns = [], 
    isLoading: runsLoading, 
    isError: runsError, 
    refetch: refetchRuns 
  } = useQuery({
    queryKey: ['runs'],
    queryFn: getAllRuns,
  });

  const handleRetry = () => {
    refetchTimeline();
    refetchTimelineData();
    refetchRuns();
    toast({
      title: "Повторная попытка",
      description: "Пытаемся загрузить данные снова...",
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            История изменений
          </h2>
          <p className="text-muted-foreground">
            Хронология событий и прогонов в проектах
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
      
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Лента событий</TabsTrigger>
          <TabsTrigger value="runs">История прогонов</TabsTrigger>
          <TabsTrigger value="legacy">Классический вид</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-6">
          <TimelineFeed 
            events={timelineEventsData}
            isLoading={timelineDataLoading}
            isError={timelineDataError}
            onRetry={handleRetry}
          />
        </TabsContent>
        
        <TabsContent value="runs" className="space-y-6">
          <RunsHistory 
            projectRuns={allRuns}
            isLoading={runsLoading}
            isError={runsError}
            onRetry={handleRetry}
          />
        </TabsContent>
        
        <TabsContent value="legacy" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
