import { ChevronDown, ChevronRight, Download, Folder, FileText, CheckCircle } from 'lucide-react';
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
    <div className="border-b border-border py-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <CheckCircle className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">
              {project.name} ({project.filesCount})
            </h3>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleProjectExpansion(project.id)}
            data-testid={`expand-tree-${project.id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? 'Скрыть папки' : 'Развернуть папки'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadProject(project.id)}
            data-testid={`download-${project.id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 ml-10 bg-accent/30 rounded-md p-2">
          {project.fileTree.map((node, index) => (
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
