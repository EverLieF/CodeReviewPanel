import { useQuery } from '@tanstack/react-query';
import { getReviewerReport } from '../lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Clock, FileText, ExternalLink, Eye } from 'lucide-react';
import { useState } from 'react';
import { FileViewer } from './file-viewer';

interface ReviewerTabProps {
  projectId: string;
}

interface LintError {
  line: number;
  code: string;
  message: string;
}

interface TestItem {
  id: string;
  status: string;
  message?: string;
}

interface Requirement {
  id: string;
  title: string;
  status: string;
  evidence?: string;
}

interface ReviewerReport {
  checks: {
    runId: string;
    createdAt: string;
    staticCheck?: {
      tests: {
        passed: number;
        failed: number;
        items: TestItem[];
      };
      lint: {
        errors: Array<{
          file: string;
          line: number;
          code: string;
          message: string;
        }>;
      };
      metrics: {
        pyFiles: number;
        lines: number;
        todos: number;
      };
      requirements: Requirement[];
    };
  };
  feedback: {
    summary: string;
    score: number;
    verdict: string;
    requirements: string[];
    problems: string[];
    next_steps: string[];
  };
  byFile: Record<string, LintError[]>;
}

export function ReviewerTab({ projectId }: ReviewerTabProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const { 
    data: report, 
    isLoading, 
    isError 
  } = useQuery<ReviewerReport>({
    queryKey: ['reviewerReport', projectId],
    queryFn: () => getReviewerReport(projectId),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">
          Отчёт ревьюера недоступен
        </h3>
        <p className="text-muted-foreground">
          {isError ? 'Ошибка загрузки отчёта' : 'Отчёт ещё не сформирован. Запустите проверку проекта.'}
        </p>
      </div>
    );
  }

  const { checks, feedback, byFile } = report;
  const { staticCheck } = checks;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'to_reviewer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'send_back':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'to_reviewer':
        return 'На ревью';
      case 'send_back':
        return 'На доработку';
      default:
        return verdict;
    }
  };

  const getRequirementIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'skipped':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRequirementText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Пройдено';
      case 'failed':
        return 'Провалено';
      case 'partial':
        return 'Частично';
      case 'skipped':
        return 'Пропущено';
      default:
        return 'Неизвестно';
    }
  };

  const handleOpenFile = (filePath: string, line?: number) => {
    setSelectedFile(filePath);
    if (line) {
      setSelectedLine(line);
    }
  };

  const totalProblems = (staticCheck?.lint?.errors?.length || 0) + (staticCheck?.tests?.failed || 0) + feedback.problems.length;

  return (
    <div className="space-y-6">
      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Оценка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(feedback.score)}`}>
              {feedback.score}/100
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Статус
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getVerdictColor(feedback.verdict)}>
              {getVerdictText(feedback.verdict)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Проблем
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalProblems}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Что уже проверено автоматически */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Что уже проверено автоматически
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Метрики проекта */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Метрики проекта</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {staticCheck?.metrics?.pyFiles || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Python файлов</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {staticCheck?.metrics?.lines || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Строк кода</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {staticCheck?.metrics?.todos || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">TODO комментариев</div>
                </div>
              </div>
            </div>

            {/* Требования */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Проверка требований</h4>
              <div className="space-y-2">
                {(staticCheck?.requirements || []).map((requirement, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
                    {getRequirementIcon(requirement.status)}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{requirement.title}</span>
                      {requirement.evidence && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {requirement.evidence}
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant={requirement.status === 'passed' ? 'default' : requirement.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {getRequirementText(requirement.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Тесты */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Результаты тестов ({staticCheck?.tests?.passed || 0} пройдено, {staticCheck?.tests?.failed || 0} провалено)
              </h4>
              {(staticCheck?.tests?.items?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {(staticCheck?.tests?.items || []).map((test, index) => (
                    <div key={index} className={`flex items-start space-x-2 p-3 rounded-lg border ${
                      test.status === 'passed' 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}>
                      {test.status === 'passed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${
                          test.status === 'passed' 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {test.id}
                        </div>
                        {test.message && (
                          <div className={`text-xs mt-1 font-mono whitespace-pre-wrap ${
                            test.status === 'passed' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {test.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Тесты не найдены
                </div>
              )}
            </div>

            {/* Проблемы по файлам */}
            {Object.keys(byFile).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Проблемы линтера по файлам ({Object.keys(byFile).length} файлов)
                </h4>
                <div className="space-y-4">
                  {Object.entries(byFile).map(([filePath, errors]) => (
                    <div key={filePath} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-foreground">
                            {filePath.split('/').pop()}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {errors.length} проблем
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFile(filePath)}
                              className="text-xs h-6 px-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Открыть
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        {errors.map((error, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {error.line}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {error.code}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenFile(filePath, error.line)}
                                  className="text-xs h-5 px-2 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Открыть на строке {error.line}
                                </Button>
                              </div>
                              <div className="text-sm text-red-800 dark:text-red-200">
                                {error.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Общие проблемы */}
            {feedback.problems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Общие проблемы</h4>
                <div className="space-y-2">
                  {feedback.problems.map((problem, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-800 dark:text-red-200">{problem}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Следующие шаги */}
      {feedback.next_steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Следующие шаги</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {feedback.next_steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm text-blue-800 dark:text-blue-200">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Модальное окно для просмотра файла */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">Просмотр файла: {selectedFile}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedLine(null);
                }}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileViewer projectId={projectId} filePath={selectedFile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
