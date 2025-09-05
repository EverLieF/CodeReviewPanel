import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Folder, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '../store/project-store';
import { FileNode } from '../lib/types';

interface UploadProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadProjectModal({ open, onClose }: UploadProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { addProject } = useProjectStore();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const buildFileTree = (files: File[]): FileNode[] => {
    const tree: { [key: string]: any } = {};
    
    files.forEach(file => {
      const pathParts = file.webkitRelativePath || file.name;
      const parts = pathParts.split('/').filter(part => part);
      
      let current = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        
        if (!current[part]) {
          current[part] = isFile ? { type: 'file' } : { type: 'folder', children: {} };
        }
        
        if (!isFile) {
          current = current[part].children;
        }
      }
    });

    const convertToFileNodes = (obj: any): FileNode[] => {
      return Object.entries(obj).map(([name, data]: [string, any]) => {
        if (data.type === 'file') {
          return {
            name,
            type: 'file' as const,
            icon: 'file-code'
          };
        } else {
          return {
            name,
            type: 'folder' as const,
            children: convertToFileNodes(data.children || {})
          };
        }
      });
    };

    return convertToFileNodes(tree);
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название проекта',
        variant: 'destructive',
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файлы для загрузки',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileTree = buildFileTree(uploadedFiles);
      
      const newProject = {
        id: Date.now().toString(),
        name: projectName,
        description: projectDescription || 'Загруженный репозиторий',
        status: 'ready' as const,
        filesCount: uploadedFiles.length,
        lastModified: 'только что',
        fileTree
      };

      addProject(newProject);

      toast({
        title: 'Успешно!',
        description: 'Репозиторий успешно загружен',
      });

      // Reset form
      setProjectName('');
      setProjectDescription('');
      setUploadedFiles([]);
      onClose();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить репозиторий',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Загрузить репозиторий</DialogTitle>
          <DialogDescription>
            Выберите файлы вашего проекта для создания нового репозитория
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Название проекта *</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Введите название проекта"
                data-testid="project-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="project-description">Описание проекта</Label>
              <Textarea
                id="project-description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Краткое описание проекта (опционально)"
                rows={3}
                data-testid="project-description-input"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label>Файлы репозитория</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <input
                  type="file"
                  multiple
                  {...({ webkitdirectory: "" } as any)}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  data-testid="file-upload-input"
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Выбрать папку
                </Label>
              </div>
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Загруженные файлы ({uploadedFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1 px-2 hover:bg-muted rounded text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-mono text-xs">
                        {file.webkitRelativePath || file.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading}
              data-testid="submit-upload"
            >
              {isUploading ? 'Загрузка...' : 'Создать проект'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}