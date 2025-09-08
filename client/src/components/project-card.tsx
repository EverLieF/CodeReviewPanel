import { ChevronDown, ChevronRight, Download, Folder, FileText, CheckCircle, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '../store/project-store';
import { Project, FileNode } from '../lib/types';
import { useQuery } from '@tanstack/react-query';
import { getProjectTree } from '../lib/api';
import { useRunCheck } from '../hooks/use-run-check';

interface ProjectCardProps {
  project: Project;
  onShowReport?: () => void;
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const marginLeft = depth * 16;
  
  return (
    <div>
      <div 
        className="flex items-center text-muted-foreground text-sm py-1 pl-4"
        style={{ marginLeft }}
      >
        {node.type === 'folder' ? (
          <Folder className="w-4 h-4 mr-2 text-blue-500" />
        ) : (
          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
        )}
        <span>{node.name}</span>
        {node.type === 'file' && (
          <span className="ml-auto text-xs text-muted-foreground">НЕТ КОММЕНТАРИЕВ</span>
        )}
      </div>
      {node.children?.map((child, index) => (
        <FileTreeNode 
          key={`${child.name}-${index}`} 
          node={child} 
          depth={depth + 1} 
        />
      ))}
    </div>
  );
}

export function ProjectCard({ project, onShowReport }: ProjectCardProps) {
  const { expandedProjects, toggleProjectExpansion, downloadProject } = useProjectStore();
  const isExpanded = expandedProjects.has(project.id);

  const { data: treeNodes, isLoading: isTreeLoading, isError: isTreeError } = useQuery({
    queryKey: ['projectTree', project.id],
    queryFn: () => getProjectTree(project.id, '/'),
    enabled: isExpanded,
  });

  const { 
    status: runStatus, 
    runCheck, 
    isLoading: isRunLoading, 
    error: runError 
  } = useRunCheck({ projectId: project.id });

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'errors':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return 'Готов';
      case 'in-progress':
        return 'В работе';
      case 'errors':
        return 'Ошибки';
      default:
        return 'Неизвестно';
    }
  };

  const getRunStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'queued':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'running':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'errors':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRunStatusText = (status: string) => {
    switch (status) {
      case 'idle':
        return 'Не запущено';
      case 'queued':
        return 'В очереди';
      case 'running':
        return 'Выполняется';
      case 'ready':
        return 'Готово';
      case 'errors':
        return 'Ошибки';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className="border-b border-border py-4 hover:bg-accent/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {project.name} ({project.filesCount})
            </h3>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          <Badge 
            variant="secondary" 
            className={getRunStatusColor(runStatus)}
          >
            {runStatus === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {getRunStatusText(runStatus)}
          </Badge>
          {onShowReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShowReport();
              }}
              className="text-xs"
              title="Показать отчёт"
            >
              <span className="hidden sm:inline">Показать отчёт</span>
              <span className="sm:hidden">Отчёт</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              runCheck();
            }}
            disabled={isRunLoading || runStatus === 'queued' || runStatus === 'running'}
            data-testid={`run-check-${project.id}`}
            className="text-muted-foreground hover:text-foreground"
            title="Прогнать проверку"
          >
            {isRunLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="ml-1 hidden sm:inline">Прогнать проверку</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleProjectExpansion(project.id);
            }}
            data-testid={`expand-tree-${project.id}`}
            className="text-muted-foreground hover:text-foreground"
            title={isExpanded ? 'Скрыть папки' : 'Развернуть папки'}
          >
            <span className="hidden sm:inline">
              {isExpanded ? 'Скрыть папки' : 'Развернуть папки'}
            </span>
            <span className="sm:hidden">
              {isExpanded ? 'Скрыть' : 'Папки'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              downloadProject(project.id);
            }}
            data-testid={`download-${project.id}`}
            className="text-muted-foreground hover:text-foreground"
            title="Скачать проект"
          >
            <Download className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Скачать</span>
          </Button>
        </div>
      </div>
      
      {runError && (
        <div className="mt-2 ml-4 sm:ml-10 text-sm text-red-600">
          Ошибка при запуске проверки: {runError.message}
        </div>
      )}
      
      {isExpanded && (
        <div className="mt-4 ml-4 sm:ml-10 bg-accent/30 rounded-md p-2 overflow-x-auto">
          {isTreeError && (
            <div className="text-sm text-red-600">Не удалось загрузить дерево файлов</div>
          )}
          {isTreeLoading && (
            <div className="text-sm text-muted-foreground">Загружаем дерево…</div>
          )}
          {!isTreeLoading && !isTreeError && (treeNodes ?? []).map((node, index) => (
            <FileTreeNode 
              key={`${node.name}-${index}`} 
              node={node} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
