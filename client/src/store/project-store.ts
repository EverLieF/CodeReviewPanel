import { create } from 'zustand';
import { Project, ReviewComment, TimelineEvent, CommentFilter, Theme } from '../lib/types';
import { mockProjects, mockComments, mockTimelineEvents } from '../lib/mock-data';

interface ProjectStore {
  // State
  projects: Project[];
  comments: ReviewComment[];
  timelineEvents: TimelineEvent[];
  expandedProjects: Set<string>;
  commentFilter: CommentFilter;
  theme: Theme;
  isLoading: boolean;

  // Actions
  toggleProjectExpansion: (projectId: string) => void;
  setCommentFilter: (filter: CommentFilter) => void;
  toggleTheme: () => void;
  resolveComment: (commentId: string) => void;
  downloadProject: (projectId: string) => void;
  exportTimelineCSV: () => void;
  setLoading: (loading: boolean) => void;
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: mockProjects,
  comments: mockComments,
  timelineEvents: mockTimelineEvents,
  expandedProjects: new Set(),
  commentFilter: 'all',
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as Theme) || 'light',
  isLoading: false,

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

  resolveComment: (commentId: string) => {
    const { comments } = get();
    const updatedComments = comments.map(comment =>
      comment.id === commentId 
        ? { ...comment, status: 'resolved' as const }
        : comment
    );
    
    set({ comments: updatedComments });
  },

  downloadProject: (projectId: string) => {
    const { projects } = get();
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      // Simulate download
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  },

  exportTimelineCSV: () => {
    const { timelineEvents } = get();
    
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
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  addProject: (project: Project) => {
    const { projects } = get();
    const newProjects = [project, ...projects];
    set({ projects: newProjects });
  }
}));
