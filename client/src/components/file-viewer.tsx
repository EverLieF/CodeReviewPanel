import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  RefreshCw,
  Send
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFile, getComments, getReviewerReport } from '../lib/api';
import { useAddComment, useUpdateCommentStatus, useDeleteComment } from '../hooks/use-mutations';
import { useToast } from '../hooks/use-toast';
import type { CodeFile, ReviewComment } from '../lib/types';

interface FileViewerProps {
  projectId: string;
  filePath: string;
  className?: string;
}

interface LineCommentFormProps {
  lineNumber: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function LineCommentForm({ lineNumber, onSubmit, onCancel, isSubmitting }: LineCommentFormProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
      <div className="text-xs text-muted-foreground">
        Комментарий к строке {lineNumber}
      </div>
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введите комментарий..."
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="w-3 h-3 mr-1" />
          Отмена
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !text.trim()}
        >
          <Send className="w-3 h-3 mr-1" />
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </Button>
      </div>
    </div>
  );
}

interface LineCommentProps {
  comment: ReviewComment;
  onUpdateStatus: (status: 'needs-fix' | 'suggestion' | 'resolved') => void;
  onDelete: () => void;
  isUpdating: boolean;
}

function LineComment({ comment, onUpdateStatus, onDelete, isUpdating }: LineCommentProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'needs-fix':
        return <AlertTriangle className="w-3 h-3" />;
      case 'suggestion':
        return <Lightbulb className="w-3 h-3" />;
      case 'resolved':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

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
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
      <div className="text-sm text-foreground">
        {comment.text}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-xs font-medium bg-foreground text-background">
              {comment.authorInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {comment.author}
          </span>
          <span className="text-xs text-muted-foreground">
            {comment.timestamp}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getStatusColor(comment.status)}`}
          >
            {getStatusIcon(comment.status)}
            <span className="ml-1">{getStatusText(comment.status)}</span>
          </Badge>
          
          {comment.status !== 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus('resolved')}
              disabled={isUpdating}
              className="h-6 px-2 text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Решить
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={isUpdating}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FileViewer({ projectId, filePath, className }: FileViewerProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const { toast } = useToast();
  
  const addCommentMutation = useAddComment(projectId);
  const updateCommentMutation = useUpdateCommentStatus(projectId);
  const deleteCommentMutation = useDeleteComment(projectId);

  // Загружаем файл
  const { 
    data: codeFile, 
    isLoading: fileLoading, 
    isError: fileError, 
    refetch: refetchFile 
  } = useQuery({
    queryKey: ['file', projectId, filePath],
    queryFn: () => getFile(projectId, filePath),
  });

  // Загружаем комментарии
  const { 
    data: comments = [], 
    isLoading: commentsLoading, 
    isError: commentsError, 
    refetch: refetchComments 
  } = useQuery({
    queryKey: ['comments', projectId],
    queryFn: () => getComments(projectId),
  });

  // Загружаем отчёт ревьюера для подсветки проблемных строк
  const { 
    data: reviewerReport, 
    isLoading: reportLoading 
  } = useQuery({
    queryKey: ['reviewerReport', projectId],
    queryFn: () => getReviewerReport(projectId),
    enabled: !!projectId,
  });

  // Объединяем данные файла с комментариями и проблемами
  const enrichedFile = codeFile ? {
    ...codeFile,
    content: codeFile.content.map(line => {
      const lineComments = comments.filter(comment => comment.line === line.number && comment.file === filePath);
      const lineIssues = reviewerReport?.byFile?.[filePath]?.filter(issue => issue.line === line.number) || [];
      
      return {
        ...line,
        hasIssues: lineIssues.length > 0,
        issues: lineIssues.map(issue => issue.message),
        comments: lineComments
      };
    })
  } : null;

  const handleAddComment = (lineNumber: number, text: string) => {
    addCommentMutation.mutate(
      { 
        text, 
        line: lineNumber, 
        file: filePath 
      },
      {
        onSuccess: () => {
          setShowCommentForm(false);
          setSelectedLine(null);
        },
      }
    );
  };

  const handleUpdateCommentStatus = (commentId: string, status: 'needs-fix' | 'suggestion' | 'resolved') => {
    updateCommentMutation.mutate({
      commentId,
      input: { status }
    });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  const getLineClass = (line: any) => {
    const classes = ['flex', 'group', 'hover:bg-muted/50'];
    
    if (line.type === 'added') {
      classes.push('bg-green-50 dark:bg-green-900/20');
    } else if (line.type === 'removed') {
      classes.push('bg-red-50 dark:bg-red-900/20');
    }
    
    if (line.hasIssues) {
      classes.push('bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500');
    }
    
    if (selectedLine === line.number) {
      classes.push('bg-blue-50 dark:bg-blue-900/20');
    }
    
    return classes.join(' ');
  };

  const getLineNumberClass = (line: any) => {
    const classes = ['w-12 text-muted-foreground text-right mr-4 px-2 py-1 select-none'];
    
    if (line.type === 'added') {
      classes.push('bg-green-100 dark:bg-green-900/40');
    } else if (line.type === 'removed') {
      classes.push('bg-red-100 dark:bg-red-900/40');
    }
    
    if (line.hasIssues) {
      classes.push('bg-yellow-100 dark:bg-yellow-900/40');
    }
    
    return classes.join(' ');
  };

  if (fileError || commentsError) {
    return (
      <Card className={`overflow-hidden h-full ${className}`}>
        <CardHeader className="border-b border-border p-4 bg-muted/30">
          <h3 className="font-medium text-card-foreground">
            Просмотр файла
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <h4 className="text-lg font-medium text-card-foreground mb-2">
              Ошибка загрузки
            </h4>
            <p className="text-muted-foreground mb-4">
              Не удалось загрузить файл или комментарии
            </p>
            <Button 
              onClick={() => {
                refetchFile();
                refetchComments();
                toast({
                  title: "Повторная попытка",
                  description: "Пытаемся загрузить данные снова...",
                });
              }}
              variant="outline"
              className="font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fileLoading || !enrichedFile) {
    return (
      <Card className={`overflow-hidden h-full ${className}`}>
        <CardHeader className="border-b border-border p-4 bg-muted/30">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="flex">
              <Skeleton className="w-12 h-6 mr-4" />
              <Skeleton className="flex-1 h-6" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden h-full ${className}`}>
      <CardHeader className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">
            {enrichedFile.path}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-xs">
              +{enrichedFile.additions}
            </span>
            <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-xs">
              -{enrichedFile.deletions}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-auto h-full">
        <div className="font-mono text-sm">
          {enrichedFile.content.map((line) => (
            <div key={line.number}>
              <div 
                className={getLineClass(line)}
                onClick={() => {
                  setSelectedLine(line.number);
                  setShowCommentForm(true);
                }}
              >
                <span className={getLineNumberClass(line)}>
                  {line.number}
                </span>
                <span className="flex-1 px-4 py-1 relative">
                  {line.content}
                  {line.hasIssues && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                  )}
                  {line.comments && line.comments.length > 0 && (
                    <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    </div>
                  )}
                </span>
              </div>
              
              {/* Показываем комментарии к строке */}
              {line.comments && line.comments.length > 0 && (
                <div className="ml-16 px-4 py-2 space-y-2 bg-muted/20">
                  {line.comments.map((comment) => (
                    <LineComment
                      key={comment.id}
                      comment={comment}
                      onUpdateStatus={(status) => handleUpdateCommentStatus(comment.id, status)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      isUpdating={updateCommentMutation.isPending || deleteCommentMutation.isPending}
                    />
                  ))}
                </div>
              )}
              
              {/* Показываем проблемы из отчёта */}
              {line.issues && line.issues.length > 0 && (
                <div className="ml-16 px-4 py-2 space-y-1 bg-yellow-50 dark:bg-yellow-900/20">
                  {line.issues.map((issue, index) => (
                    <div key={index} className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {issue}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Форма для добавления комментария */}
              {selectedLine === line.number && showCommentForm && (
                <div className="ml-16 px-4 py-2">
                  <LineCommentForm
                    lineNumber={line.number}
                    onSubmit={(text) => handleAddComment(line.number, text)}
                    onCancel={() => {
                      setShowCommentForm(false);
                      setSelectedLine(null);
                    }}
                    isSubmitting={addCommentMutation.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
