import { Skeleton } from '@/components/ui/skeleton';
import { ProjectCard } from '../components/project-card';
import { useProjectStore } from '../store/project-store';

export default function ProjectPage() {
  const { projects, isLoading } = useProjectStore();

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Проекты</h2>
        <p className="text-muted-foreground">
          Управление проектами и их файловой структурой
        </p>
      </div>
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
