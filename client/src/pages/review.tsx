import { FileViewer } from '../components/file-viewer';
import { CommentsPanel } from '../components/comments-panel';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileTree } from '../lib/api';
import { Button } from '@/components/ui/button';
import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
  // В будущем projectId будет браться из URL параметров или контекста
  const projectId = '1';
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  const { data: fileTree = [] } = useQuery({
    queryKey: ['fileTree', projectId],
    queryFn: () => getFileTree(projectId),
  });

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (nodes: any[], path = '') => {
    return nodes.map((node) => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      const isExpanded = expandedFolders.has(fullPath);
      const isSelected = selectedFile === fullPath;

      if (node.type === 'folder') {
        return (
          <div key={fullPath}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal h-8 px-2",
                isSelected && "bg-muted"
              )}
              onClick={() => toggleFolder(fullPath)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <Folder className="w-4 h-4 mr-2" />
              {node.name}
            </Button>
            {isExpanded && node.children && (
              <div className="ml-4">
                {renderFileTree(node.children, fullPath)}
              </div>
            )}
          </div>
        );
      }

      return (
        <Button
          key={fullPath}
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start text-left font-normal h-8 px-2",
            isSelected && "bg-muted"
          )}
          onClick={() => setSelectedFile(fullPath)}
        >
          <FileText className="w-4 h-4 mr-2" />
          {node.name}
        </Button>
      );
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Ревью кода</h2>
        <p className="text-muted-foreground">
          Просмотр и комментирование изменений в коде
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Боковая панель с файлами */}
        <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 overflow-auto">
          <h3 className="font-medium text-card-foreground mb-4">Файлы проекта</h3>
          <div className="space-y-1">
            {renderFileTree(fileTree)}
          </div>
        </div>
        
        {/* Основная область с просмотром файла */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <FileViewer 
              projectId={projectId} 
              filePath={selectedFile}
              className="h-full"
            />
          ) : (
            <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">
                  Выберите файл
                </h3>
                <p className="text-muted-foreground">
                  Выберите файл из списка для просмотра и комментирования
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Панель комментариев */}
        <div className="lg:col-span-1">
          <CommentsPanel projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
