import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCodeFile } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface CodeViewerProps {
  projectId?: string;
  filePath?: string;
}

export function CodeViewer({ projectId = '1', filePath = 'src/components/Dashboard.tsx' }: CodeViewerProps) {
  const { toast } = useToast();

  const { 
    data: codeFile, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['codeFile', projectId, filePath],
    queryFn: () => getCodeFile(projectId, filePath),
  });

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return '';
    }
  };

  const getLineNumberClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 dark:bg-green-900/40';
      case 'removed':
        return 'bg-red-100 dark:bg-red-900/40';
      default:
        return '';
    }
  };

  if (isError) {
    return (
      <Card className="overflow-hidden h-full">
        <CardHeader className="border-b border-border p-4 bg-muted/30">
          <h3 className="font-medium text-card-foreground">
            Просмотр кода
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <h4 className="text-lg font-medium text-card-foreground mb-2">
              Ошибка загрузки файла
            </h4>
            <p className="text-muted-foreground mb-4">
              Не удалось загрузить содержимое файла
            </p>
            <Button 
              onClick={() => {
                refetch();
                toast({
                  title: "Повторная попытка",
                  description: "Пытаемся загрузить файл снова...",
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

  if (isLoading || !codeFile) {
    return (
      <Card className="overflow-hidden h-full">
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
    <Card className="overflow-hidden h-full">
      <CardHeader className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">
            {codeFile.path}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-xs">
              +{codeFile.additions}
            </span>
            <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-xs">
              -{codeFile.deletions}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-auto h-full">
        <div className="font-mono text-sm syntax-highlight">
          {codeFile.content.map((line) => (
            <div 
              key={line.number}
              className={`flex ${getLineClass(line.type)}`}
            >
              <span 
                className={`w-12 text-muted-foreground text-right mr-4 px-2 py-1 ${getLineNumberClass(line.type)}`}
              >
                {line.number}
              </span>
              <span 
                className="flex-1 px-4 py-1"
                dangerouslySetInnerHTML={{ __html: line.content }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
