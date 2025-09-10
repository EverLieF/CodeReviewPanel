import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, FileText, BarChart3, UserCheck } from 'lucide-react';
import { ProjectCard } from '../components/project-card';
import { UploadProjectModal } from '../components/upload-project-modal';
import { DeleteProjectDialog } from '../components/delete-project-dialog';
import { ReportTab } from '../components/report-tab';
import { ReviewerTab } from '../components/reviewer-tab';
import { useProjectStore } from '../store/project-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, deleteProject } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useState } from 'react';
import { Project } from '../lib/types';

export default function ProjectPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  const { 
    data: projects = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast({
        title: "Проект удален",
        description: "Проект успешно удален из системы",
      });
      // Обновляем кэш проектов
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Обновляем кэш timeline
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      // Обновляем кэш runs
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      setProjectToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить проект",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
    }
  };

  const handleConfirmDelete = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  if (isError) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Проект студента</h2>
          <Button 
            onClick={() => setShowUploadModal(true)}
            data-testid="upload-project-btn"
            className="font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Загрузить репозиторий
          </Button>
        </div>
        
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            Ошибка загрузки проектов
          </h3>
          <p className="text-muted-foreground mb-4">
            Не удалось загрузить список проектов
          </p>
          <Button 
            onClick={() => {
              refetch();
              toast({
                title: "Повторная попытка",
                description: "Пытаемся загрузить проекты снова...",
              });
            }}
            variant="outline"
            className="font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <Skeleton className="h-3 w-2/3 mb-4" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Проект студента</h2>
        <Button 
          onClick={() => setShowUploadModal(true)}
          data-testid="upload-project-btn"
          className="font-medium bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Загрузить репозиторий</span>
          <span className="sm:hidden">Загрузить</span>
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects" className="flex items-center space-x-1 sm:space-x-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Проекты</span>
            <span className="sm:hidden">Проекты</span>
          </TabsTrigger>
          <TabsTrigger 
            value="report" 
            className="flex items-center space-x-1 sm:space-x-2"
            disabled={!selectedProjectId}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Отчёт</span>
            <span className="sm:hidden">Отчёт</span>
          </TabsTrigger>
          <TabsTrigger 
            value="reviewer" 
            className="flex items-center space-x-1 sm:space-x-2"
            disabled={!selectedProjectId}
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Ревьюер</span>
            <span className="sm:hidden">Ревьюер</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="mt-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Нет проектов
              </h3>
              <p className="text-muted-foreground">
                Проекты будут отображаться здесь после их создания
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onShowReport={() => {
                    setSelectedProjectId(project.id);
                    setActiveTab('report');
                  }}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="report" className="mt-6">
          {selectedProjectId ? (
            <ReportTab projectId={selectedProjectId} />
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Выберите проект
              </h3>
              <p className="text-muted-foreground">
                Выберите проект из списка, чтобы просмотреть его отчёт
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="reviewer" className="mt-6">
          {selectedProjectId ? (
            <ReviewerTab projectId={selectedProjectId} />
          ) : (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Выберите проект
              </h3>
              <p className="text-muted-foreground">
                Выберите проект из списка, чтобы просмотреть отчёт ревьюера
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UploadProjectModal 
        open={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => refetch()}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
