import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Folder, FileText, Github, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadZip, uploadRepoUrl } from '../lib/api';
import { FileNode } from '../lib/types';

interface UploadProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadProjectModal({ open, onClose, onSuccess }: UploadProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('zip');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = (event.target.files && event.target.files[0]) || null;
    setUploadedFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
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

    if (activeTab === 'zip' && !uploadedFile) {
      toast({
        title: 'Ошибка',
        description: 'Выберите ZIP-файл для загрузки',
        variant: 'destructive',
      });
      return;
    }

    if (activeTab === 'url' && !githubUrl.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите URL GitHub репозитория',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      let result;
      
      if (activeTab === 'zip') {
        // Создаем FormData для загрузки ZIP
        const formData = new FormData();
        formData.append('file', uploadedFile!);
        result = await uploadZip(formData);
      } else {
        // Загружаем по GitHub URL
        result = await uploadRepoUrl({ repoUrl: githubUrl });
      }
      
      toast({
        title: 'Успех',
        description: 'Проект успешно загружен',
      });

      // Reset form
      setProjectName('');
      setProjectDescription('');
      setUploadedFile(null);
      setGithubUrl('');
      setActiveTab('zip');
      
      // Вызываем callback для обновления списка проектов
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить проект',
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

          {/* Upload Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zip" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Файл ZIP
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub URL
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="zip" className="space-y-4">
              <div className="space-y-4">
                <Label>Файлы репозитория</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Выберите ZIP-архив проекта для загрузки
                    </p>
                    <input
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      data-testid="file-upload-input"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      Выбрать ZIP
                    </Label>
                  </div>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFile && (
                <div className="space-y-2">
                  <Label>Выбранный файл</Label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2">
                    <div className="flex items-center justify-between py-1 px-2 hover:bg-muted rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="font-mono text-xs">
                          {uploadedFile.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-4">
                <Label htmlFor="github-url">URL GitHub репозитория *</Label>
                <div className="space-y-2">
                  <Input
                    id="github-url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    data-testid="github-url-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Введите полный URL репозитория GitHub (например: https://github.com/username/repository)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
              {isUploading ? 'Загрузка...' : (activeTab === 'zip' ? 'Загрузить ZIP' : 'Загрузить из GitHub')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}