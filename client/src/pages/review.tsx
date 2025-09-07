import { CodeViewer } from '../components/code-viewer';
import { CommentsPanel } from '../components/comments-panel';

export default function ReviewPage() {
  // В будущем projectId будет браться из URL параметров или контекста
  const projectId = '1';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Ревью кода</h2>
        <p className="text-muted-foreground">
          Просмотр и комментирование изменений в коде
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        <CodeViewer projectId={projectId} />
        <CommentsPanel projectId={projectId} />
      </div>
    </div>
  );
}
