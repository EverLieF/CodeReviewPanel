export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ready' | 'in-progress' | 'errors';
  filesCount: number;
  lastModified: string;
  fileTree: FileNode[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  icon?: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  authorInitials: string;
  timestamp: string;
  line: number;
  text: string;
  status: 'needs-fix' | 'suggestion' | 'resolved';
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  author: string;
  type: 'review' | 'approval' | 'error' | 'project-created';
  icon: string;
  iconColor: string;
  filesChanged?: number;
  commentsCount?: number;
  errorsCount?: number;
}

export interface CodeFile {
  path: string;
  content: CodeLine[];
  additions: number;
  deletions: number;
}

export interface CodeLine {
  number: number;
  content: string;
  type: 'normal' | 'added' | 'removed';
  highlighted?: boolean;
}

export type Theme = 'light' | 'dark';

export type CommentFilter = 'all' | 'needs-fix' | 'suggestion' | 'resolved';
