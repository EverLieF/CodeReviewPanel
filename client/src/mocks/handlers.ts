import { http, HttpResponse } from 'msw';
import { mockProjects, mockComments, mockTimelineEvents, mockCodeFile } from '../lib/mock-data';
import { Project, ReviewComment, TimelineEvent, CodeFile } from '../lib/types';

// In-memory хранилище для проектов (для POST запросов)
let projects: Project[] = [...mockProjects];
let comments: ReviewComment[] = [...mockComments];
let timelineEvents: TimelineEvent[] = [...mockTimelineEvents];

export const handlers = [
  // GET /api/projects - получить все проекты
  http.get('/api/projects', () => {
    return HttpResponse.json(projects);
  }),

  // POST /api/projects - создать новый проект
  http.post('/api/projects', async ({ request }) => {
    const contentType = request.headers.get('content-type');
    
    // Если это FormData (загрузка файлов)
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const description = formData.get('description') as string || 'Загруженный репозиторий';
      const files = formData.getAll('files') as File[];
      
      // Строим дерево файлов из загруженных файлов
      const buildFileTree = (files: File[]): any[] => {
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

        const convertToFileNodes = (obj: any): any[] => {
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

      const project: Project = {
        id: Date.now().toString(),
        name,
        description,
        status: 'ready',
        filesCount: files.length,
        lastModified: new Date().toISOString(),
        fileTree: buildFileTree(files)
      };
      
      projects.push(project);
      return HttpResponse.json(project, { status: 201 });
    } else {
      // Обычный JSON запрос
      const newProject = await request.json() as Omit<Project, 'id'>;
      const project: Project = {
        ...newProject,
        id: Date.now().toString(), // Простой ID генератор
      };
      
      projects.push(project);
      return HttpResponse.json(project, { status: 201 });
    }
  }),

  // GET /api/projects/:id/comments - получить комментарии для проекта
  http.get('/api/projects/:id/comments', ({ params }) => {
    const { id } = params;
    // Фильтруем комментарии по ID проекта (в реальном приложении это было бы в базе данных)
    const projectComments = comments.filter(comment => 
      // Для демонстрации используем простую логику - все комментарии относятся к проекту с id '1'
      id === '1' ? true : Math.random() > 0.5
    );
    
    return HttpResponse.json(projectComments);
  }),

  // POST /api/projects/:id/comments - добавить комментарий к проекту
  http.post('/api/projects/:id/comments', async ({ request, params }) => {
    const { id } = params;
    const newComment = await request.json() as Omit<ReviewComment, 'id' | 'author' | 'authorInitials' | 'timestamp' | 'status'>;
    
    const comment: ReviewComment = {
      ...newComment,
      id: Date.now().toString(), // Простой ID генератор
      author: 'Текущий пользователь',
      authorInitials: 'ТП',
      timestamp: 'только что',
      status: 'suggestion'
    };
    
    comments.push(comment);
    return HttpResponse.json(comment, { status: 201 });
  }),

  // PUT /api/projects/:id/comments/:commentId - обновить статус комментария
  http.put('/api/projects/:id/comments/:commentId', async ({ request, params }) => {
    const { commentId } = params;
    const { status } = await request.json() as { status: 'needs-fix' | 'suggestion' | 'resolved' };
    
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    comments[commentIndex] = { ...comments[commentIndex], status };
    return HttpResponse.json(comments[commentIndex]);
  }),

  // DELETE /api/projects/:id/comments/:commentId - удалить комментарий
  http.delete('/api/projects/:id/comments/:commentId', ({ params }) => {
    const { commentId } = params;
    
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    comments.splice(commentIndex, 1);
    return HttpResponse.json({ success: true });
  }),

  // GET /api/timeline - получить события timeline
  http.get('/api/timeline', () => {
    return HttpResponse.json(timelineEvents);
  }),

  // GET /api/projects/:id/files/:filePath - получить файл кода
  http.get('/api/projects/:id/files/:filePath', ({ params }) => {
    const { id, filePath } = params;
    
    // Для демонстрации возвращаем моковый файл
    // В реальном приложении здесь был бы запрос к файловой системе или базе данных
    const decodedFilePath = decodeURIComponent(filePath as string);
    const codeFile: CodeFile = {
      ...mockCodeFile,
      path: decodedFilePath
    };
    
    return HttpResponse.json(codeFile);
  }),
];