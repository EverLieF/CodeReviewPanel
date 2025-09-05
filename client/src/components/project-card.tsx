import { ChevronDown, ChevronRight, Download, Folder, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '../store/project-store';
import { Project, FileNode } from '../lib/types';

interface ProjectCardProps {
  project: Project;
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const marginLeft = depth * 16;
  
  return (
    <div>
      <div 
        className="flex items-center text-muted-foreground text-xs font-mono py-0.5"
        style={{ marginLeft }}
      >
        {node.type === 'folder' ? (
          <Folder className="w-3 h-3 mr-2 text-blue-500" />
        ) : (
          <FileText className="w-3 h-3 mr-2 text-green-500" />
        )}
        {node.name}
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

export function ProjectCard({ project }: ProjectCardProps) {
  const { expandedProjects, toggleProjectExpansion, downloadProject } = useProjectStore();
  const isExpanded = expandedProjects.has(project.id);

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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {project.description}
            </p>
          </div>
          <span 
            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}
          >
            {getStatusText(project.status)}
          </span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground mb-4 space-x-4">
          <span>
            <FileText className="w-4 h-4 inline mr-1" />
            {project.filesCount} файлов
          </span>
          <span>
            {project.lastModified}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleProjectExpansion(project.id)}
            className="flex-1"
            data-testid={`expand-tree-${project.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            {isExpanded ? 'Скрыть дерево' : 'Дерево файлов'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadProject(project.id)}
            data-testid={`download-${project.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="space-y-1">
              {project.fileTree.map((node, index) => (
                <FileTreeNode 
                  key={`${node.name}-${index}`} 
                  node={node} 
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
