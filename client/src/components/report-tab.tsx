import { useQuery } from '@tanstack/react-query';
import { getReport } from '../lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Clock, FileText, Target } from 'lucide-react';

interface ReportTabProps {
  projectId: string;
}

interface FeedbackData {
  summary: string;
  score: number;
  verdict: string;
  requirements: string[];
  problems: string[];
  next_steps: string[];
}

interface LintError {
  file: string;
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

interface StaticCheck {
  tests: {
    passed: number;
    failed: number;
    items: TestItem[];
  };
  lint: {
    errors: LintError[];
  };
  metrics: {
    pyFiles: number;
    lines: number;
    todos: number;
  };
  requirements: Requirement[];
}

interface ChecksData {
  runId: string;
  createdAt: string;
  staticCheck?: StaticCheck;
}

interface StudentReport {
  checks: ChecksData;
  feedback: FeedbackData;
}

export function ReportTab({ projectId }: ReportTabProps) {
  const { 
    data: report, 
    isLoading, 
    isError 
  } = useQuery<StudentReport>({
    queryKey: ['report', projectId],
    queryFn: () => getReport(projectId),
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

  if (isError || !report?.feedback) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">
          Отчёт недоступен
        </h3>
        <p className="text-muted-foreground">
          {isError ? 'Ошибка загрузки отчёта' : 'Отчёт ещё не сформирован. Запустите проверку проекта.'}
        </p>
      </div>
    );
  }

  const { feedback } = report;

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

  const getRequirementStatus = (requirement: string) => {
    if (requirement.includes(': passed')) return { status: 'passed', text: 'Пройдено' };
    if (requirement.includes(': failed')) return { status: 'failed', text: 'Провалено' };
    if (requirement.includes(': partial')) return { status: 'partial', text: 'Частично' };
    if (requirement.includes(': skipped')) return { status: 'skipped', text: 'Пропущено' };
    return { status: 'unknown', text: 'Неизвестно' };
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

  return (
    <div className="space-y-6">
      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Target className="w-4 h-4 mr-2" />
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
              <FileText className="w-4 h-4 mr-2" />
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
              {feedback.problems.length + 
               (report.checks?.staticCheck?.lint?.errors?.length || 0) + 
               (report.checks?.staticCheck?.tests?.failed || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Краткое описание */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Краткое описание</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Метрики проекта */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Метрики проекта</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {report.checks?.staticCheck?.metrics?.pyFiles || 0}
              </div>
              <div className="text-sm text-muted-foreground">Python файлов</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {report.checks?.staticCheck?.metrics?.lines || 0}
              </div>
              <div className="text-sm text-muted-foreground">Строк кода</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {report.checks?.staticCheck?.metrics?.todos || 0}
              </div>
              <div className="text-sm text-muted-foreground">TODO комментариев</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Проблемы */}
      {(feedback.problems.length > 0 || 
        (report.checks?.staticCheck?.lint?.errors?.length || 0) > 0 || 
        (report.checks?.staticCheck?.tests?.failed || 0) > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Обнаруженные проблемы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Общие проблемы из feedback */}
              {feedback.problems.map((problem, index) => (
                <div key={`general-${index}`} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800 dark:text-red-200">{problem}</span>
                </div>
              ))}

              {/* Ошибки линтера */}
              {(report.checks?.staticCheck?.lint?.errors?.length || 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Ошибки линтера ({report.checks?.staticCheck?.lint?.errors?.length || 0})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/4">Файл</TableHead>
                          <TableHead className="w-16">Строка</TableHead>
                          <TableHead className="w-20">Код</TableHead>
                          <TableHead>Сообщение</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(report.checks?.staticCheck?.lint?.errors || []).map((error, index) => (
                          <TableRow key={`lint-${index}`} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">
                              {error.file.split('/').pop()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {error.line}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {error.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {error.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Упавшие тесты */}
              {(report.checks?.staticCheck?.tests?.failed || 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Упавшие тесты ({report.checks?.staticCheck?.tests?.failed || 0})</h4>
                  <div className="space-y-2">
                    {(report.checks?.staticCheck?.tests?.items || [])
                      .filter(item => item.status === 'failed')
                      .map((test, index) => (
                        <div key={`test-${index}`} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-800 dark:text-red-200">
                              {test.id}
                            </div>
                            {test.message && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono whitespace-pre-wrap">
                                {test.message}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Требования */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Требования</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(report.checks?.staticCheck?.requirements || []).map((requirement, index) => {
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
              
              return (
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
              );
            })}
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
    </div>
  );
}
