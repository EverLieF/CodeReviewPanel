import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, Reply, MapPin } from 'lucide-react';
import { useProjectStore } from '../store/project-store';
import { CommentFilter } from '../lib/types';

export function CommentsPanel() {
  const { comments, commentFilter, setCommentFilter, resolveComment } = useProjectStore();

  const filteredComments = comments.filter(comment => {
    if (commentFilter === 'all') return true;
    return comment.status === commentFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'needs-fix':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'needs-fix':
        return 'Надо исправить';
      case 'suggestion':
        return 'Предложение';
      case 'resolved':
        return 'Решено';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">
            Комментарии ревью
          </h3>
          <Select value={commentFilter} onValueChange={(value: CommentFilter) => setCommentFilter(value)}>
            <SelectTrigger className="w-48" data-testid="comment-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все комментарии</SelectItem>
              <SelectItem value="needs-fix">Надо исправить</SelectItem>
              <SelectItem value="suggestion">Предложения</SelectItem>
              <SelectItem value="resolved">Решено</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 overflow-auto h-full">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Нет комментариев для отображения</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div 
              key={comment.id} 
              className="bg-muted rounded-lg p-4 space-y-3"
            >
              <div className="text-sm text-foreground mb-3">
                {comment.text}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs font-medium bg-foreground text-background">
                      {comment.authorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {comment.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • код-ревьюер
                  </span>
                </div>
                
                {comment.status === 'needs-fix' && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 h-auto"
                    data-testid={`needs-fix-${comment.id}`}
                  >
                    НАДО ИСПРАВИТЬ
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
