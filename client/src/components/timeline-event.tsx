import { Card, CardContent } from '@/components/ui/card';
import { TimelineEvent } from '../lib/types';
import { 
  GitBranch, 
  Check, 
  AlertTriangle, 
  Plus, 
  User, 
  FileText, 
  MessageCircle, 
  Bug,
  Folder,
  Bot
} from 'lucide-react';

interface TimelineEventProps {
  event: TimelineEvent;
  isLast?: boolean;
}

export function TimelineEventComponent({ event, isLast }: TimelineEventProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'code-branch':
        return GitBranch;
      case 'check':
        return Check;
      case 'exclamation-triangle':
        return AlertTriangle;
      case 'plus':
        return Plus;
      default:
        return GitBranch;
    }
  };

  const getIconColor = (iconColor: string) => {
    switch (iconColor) {
      case 'bg-primary':
        return 'bg-primary text-primary-foreground';
      case 'bg-green-500':
        return 'bg-green-500 text-white';
      case 'bg-red-500':
        return 'bg-red-500 text-white';
      case 'bg-blue-500':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const Icon = getIcon(event.icon);

  return (
    <div className="flex space-x-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(event.iconColor)}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-0.5 h-16 bg-border mt-2" />}
      </div>
      
      <div className="flex-1 pb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-card-foreground">
                {event.title}
              </h3>
              <span className="text-sm text-muted-foreground">
                {event.timestamp}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {event.description}
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span className="flex items-center">
                {event.author === 'Система тестирования' ? (
                  <Bot className="w-3 h-3 mr-1" />
                ) : (
                  <User className="w-3 h-3 mr-1" />
                )}
                {event.author}
              </span>
              
              {event.filesChanged && (
                <span className="flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  {event.filesChanged} файл{event.filesChanged > 1 ? 'ов' : ''} изменено
                </span>
              )}
              
              {event.commentsCount && (
                <span className="flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {event.commentsCount} комментариев
                </span>
              )}
              
              {event.errorsCount && (
                <span className="flex items-center">
                  <Bug className="w-3 h-3 mr-1" />
                  {event.errorsCount} ошибки
                </span>
              )}
              
              {event.type === 'project-created' && (
                <span className="flex items-center">
                  <Folder className="w-3 h-3 mr-1" />
                  Новый проект
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
