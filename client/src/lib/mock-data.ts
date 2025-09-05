import { Project, ReviewComment, TimelineEvent, CodeFile } from './types';

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Dashboard',
    description: 'React + TypeScript веб-приложение',
    status: 'ready',
    filesCount: 47,
    lastModified: '2 часа назад',
    fileTree: [
      {
        name: 'src',
        type: 'folder',
        children: [
          {
            name: 'components',
            type: 'folder',
            children: [
              { name: 'Dashboard.tsx', type: 'file', icon: 'file-code' },
              { name: 'Sidebar.tsx', type: 'file', icon: 'file-code' }
            ]
          },
          {
            name: 'pages',
            type: 'folder',
            children: [
              { name: 'Home.tsx', type: 'file', icon: 'file-code' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Mobile Banking App',
    description: 'React Native приложение',
    status: 'in-progress',
    filesCount: 23,
    lastModified: '1 день назад',
    fileTree: [
      {
        name: 'src',
        type: 'folder',
        children: [
          { name: 'screens', type: 'folder', children: [] },
          { name: 'components', type: 'folder', children: [] }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Data Analytics Tool',
    description: 'Python + FastAPI сервис',
    status: 'errors',
    filesCount: 15,
    lastModified: '3 дня назад',
    fileTree: [
      {
        name: 'api',
        type: 'folder',
        children: [
          { name: 'main.py', type: 'file', icon: 'file-code' },
          { name: 'routes.py', type: 'file', icon: 'file-code' }
        ]
      }
    ]
  }
];

export const mockComments: ReviewComment[] = [
  {
    id: '1',
    author: 'Алексей Петров',
    authorInitials: 'АП',
    timestamp: '2 часа назад',
    line: 10,
    text: 'Следует добавить типизацию для props. Использование any[] не рекомендуется.',
    status: 'needs-fix'
  },
  {
    id: '2',
    author: 'Мария Сидорова',
    authorInitials: 'МС',
    timestamp: '4 часа назад',
    line: 15,
    text: 'Рекомендую добавить обработку состояния загрузки для лучшего UX.',
    status: 'suggestion'
  },
  {
    id: '3',
    author: 'Иван Козлов',
    authorInitials: 'ИК',
    timestamp: '1 день назад',
    line: 6,
    text: 'Добавить валидацию входных данных.',
    status: 'resolved'
  }
];

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    title: 'Создан новый ревью',
    description: 'Алексей Петров создал ревью для изменений в Dashboard.tsx',
    timestamp: '2 часа назад',
    author: 'Алексей Петров',
    type: 'review',
    icon: 'code-branch',
    iconColor: 'bg-primary',
    filesChanged: 3,
    commentsCount: 5
  },
  {
    id: '2',
    title: 'Ревью одобрено',
    description: 'Мария Сидорова одобрила изменения в Mobile Banking App',
    timestamp: '4 часа назад',
    author: 'Мария Сидорова',
    type: 'approval',
    icon: 'check',
    iconColor: 'bg-green-500',
    filesChanged: 1
  },
  {
    id: '3',
    title: 'Найдены ошибки',
    description: 'Автоматическое тестирование выявило 3 критические ошибки в Data Analytics Tool',
    timestamp: '1 день назад',
    author: 'Система тестирования',
    type: 'error',
    icon: 'exclamation-triangle',
    iconColor: 'bg-red-500',
    errorsCount: 3
  },
  {
    id: '4',
    title: 'Создан новый проект',
    description: 'Иван Козлов создал проект "E-commerce Dashboard"',
    timestamp: '3 дня назад',
    author: 'Иван Козлов',
    type: 'project-created',
    icon: 'plus',
    iconColor: 'bg-blue-500'
  }
];

export const mockCodeFile: CodeFile = {
  path: 'src/components/Dashboard.tsx',
  additions: 15,
  deletions: 3,
  content: [
    { number: 1, content: "import React from 'react';", type: 'normal' },
    { number: 2, content: "import { useState, useEffect } from 'react';", type: 'normal' },
    { number: 3, content: "", type: 'normal' },
    { number: 4, content: "interface DashboardProps {", type: 'added' },
    { number: 5, content: "  title: string;", type: 'added' },
    { number: 6, content: "  data: any[];", type: 'added' },
    { number: 7, content: "}", type: 'normal' },
    { number: 8, content: "", type: 'normal' },
    { number: 9, content: "const Dashboard = () => {", type: 'removed' },
    { number: 10, content: "const Dashboard: React.FC<DashboardProps> = ({ title, data }) => {", type: 'added' },
    { number: 11, content: "  const [loading, setLoading] = useState(true);", type: 'normal' },
    { number: 12, content: "", type: 'normal' },
    { number: 13, content: "  return (", type: 'normal' },
    { number: 14, content: "    <div className=\"dashboard\">", type: 'normal' },
    { number: 15, content: "      <h1>{title}</h1>", type: 'normal' },
    { number: 16, content: "    </div>", type: 'normal' },
    { number: 17, content: "  );", type: 'normal' },
    { number: 18, content: "};", type: 'normal' }
  ]
};
