import { useState } from 'react';
import { FileViewer } from './file-viewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Code, MessageSquare } from 'lucide-react';

/**
 * Демонстрационный компонент для показа возможностей FileViewer
 * Показывает основные функции: просмотр файлов, подсветку проблем, комментарии
 */
export function FileViewerDemo() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const projectId = '1'; // Демо проект

  const demoFiles = [
    { name: 'main.py', path: 'src/main.py', description: 'Основной файл приложения' },
    { name: 'utils.py', path: 'src/utils.py', description: 'Вспомогательные функции' },
    { name: 'config.py', path: 'src/config.py', description: 'Конфигурация приложения' },
    { name: 'test_main.py', path: 'tests/test_main.py', description: 'Тесты для main.py' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Демонстрация FileViewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              FileViewer предоставляет следующие возможности:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Code className="w-4 h-4 mr-2" />
                Просмотр содержимого файлов с подсветкой синтаксиса
              </li>
              <li className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Добавление комментариев к конкретным строкам кода
              </li>
              <li className="flex items-center">
                <div className="w-4 h-4 mr-2 bg-yellow-500 rounded-full" />
                Подсветка проблемных строк из отчётов ревьюера
              </li>
              <li className="flex items-center">
                <div className="w-4 h-4 mr-2 bg-blue-500 rounded-full" />
                CRUD операции с комментариями (создание, обновление, удаление)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Список файлов */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Демо файлы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {demoFiles.map((file) => (
                  <Button
                    key={file.path}
                    variant={selectedFile === file.path ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedFile(file.path)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FileViewer */}
        <div className="lg:col-span-3">
          {selectedFile ? (
            <FileViewer 
              projectId={projectId} 
              filePath={selectedFile}
              className="h-[600px]"
            />
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">
                  Выберите файл
                </h3>
                <p className="text-muted-foreground">
                  Выберите файл из списка для просмотра
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Инструкция по использованию</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>1. Просмотр файла:</strong> Выберите файл из списка для просмотра его содержимого
            </div>
            <div>
              <strong>2. Добавление комментария:</strong> Кликните на строку кода, чтобы добавить к ней комментарий
            </div>
            <div>
              <strong>3. Подсветка проблем:</strong> Строки с проблемами из отчёта ревьюера подсвечиваются жёлтым цветом
            </div>
            <div>
              <strong>4. Управление комментариями:</strong> Используйте кнопки для изменения статуса или удаления комментариев
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
