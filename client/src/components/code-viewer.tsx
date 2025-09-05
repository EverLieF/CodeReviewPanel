import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { mockCodeFile } from '../lib/mock-data';

export function CodeViewer() {
  const codeFile = mockCodeFile;

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return '';
    }
  };

  const getLineNumberClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 dark:bg-green-900/40';
      case 'removed':
        return 'bg-red-100 dark:bg-red-900/40';
      default:
        return '';
    }
  };

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">
            {codeFile.path}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-xs">
              +{codeFile.additions}
            </span>
            <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-xs">
              -{codeFile.deletions}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-auto h-full">
        <div className="font-mono text-sm syntax-highlight">
          {codeFile.content.map((line) => (
            <div 
              key={line.number}
              className={`flex ${getLineClass(line.type)}`}
            >
              <span 
                className={`w-12 text-muted-foreground text-right mr-4 px-2 py-1 ${getLineNumberClass(line.type)}`}
              >
                {line.number}
              </span>
              <span 
                className="flex-1 px-4 py-1"
                dangerouslySetInnerHTML={{ __html: line.content }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
