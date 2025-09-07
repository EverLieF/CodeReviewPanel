import { create } from 'zustand';
import { CommentFilter, Theme } from '../lib/types';

interface ProjectStore {
  // UI State only
  expandedProjects: Set<string>;
  commentFilter: CommentFilter;
  theme: Theme;

  // Actions
  toggleProjectExpansion: (projectId: string) => void;
  setCommentFilter: (filter: CommentFilter) => void;
  toggleTheme: () => void;
  downloadProject: (projectId: string) => void;
  exportTimelineCSV: (timelineEvents: any[]) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  expandedProjects: new Set(),
  commentFilter: 'all',
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as Theme) || 'light',

  // Actions
  toggleProjectExpansion: (projectId: string) => {
    const { expandedProjects } = get();
    const newExpanded = new Set(expandedProjects);
    
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    
    set({ expandedProjects: newExpanded });
  },

  setCommentFilter: (filter: CommentFilter) => {
    set({ commentFilter: filter });
  },

  toggleTheme: () => {
    const { theme } = get();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      document.documentElement.className = newTheme;
    }
    
    set({ theme: newTheme });
  },


  downloadProject: (projectId: string) => {
    // Simulate download - в будущем здесь будет реальный API-запрос
    const blob = new Blob([JSON.stringify({ id: projectId }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportTimelineCSV: (timelineEvents: any[]) => {
    const csvHeaders = ['Дата', 'Событие', 'Описание', 'Автор', 'Тип'];
    const csvData = timelineEvents.map(event => [
      event.timestamp,
      event.title,
      event.description.replace(/,/g, ';'),
      event.author,
      event.type
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline-history.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}));
