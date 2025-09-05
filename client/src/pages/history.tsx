import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { TimelineEventComponent } from '../components/timeline-event';
import { useProjectStore } from '../store/project-store';

export default function HistoryPage() {
  const { timelineEvents, exportTimelineCSV } = useProjectStore();

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
          onClick={exportTimelineCSV}
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
