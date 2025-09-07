import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, addComment, updateCommentStatus, deleteComment } from '../lib/api';
import type { Project, ReviewComment } from '../lib/types';
import type { AddCommentInput, UpdateCommentStatusInput } from '../lib/api';
import { useToast } from './use-toast';

/**
 * Хук для создания нового проекта с оптимистичными обновлениями
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createProject,
    onMutate: async (newProject) => {
      // Отменяем любые исходящие запросы для projects
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Сохраняем предыдущее состояние
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      // Оптимистично добавляем новый проект
      const optimisticProject: Project = {
        id: `temp-${Date.now()}`, // Временный ID
        name: newProject.name,
        description: newProject.description || '',
        status: 'ready',
        filesCount: 0,
        lastModified: 'только что',
        fileTree: []
      };

      queryClient.setQueryData<Project[]>(['projects'], (old = []) => [
        optimisticProject,
        ...old
      ]);

      // Возвращаем контекст для отката
      return { previousProjects };
    },
    onError: (error, newProject, context) => {
      // Откатываем кеш к предыдущему состоянию
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }

      toast({
        title: 'Ошибка',
        description: 'Не удалось создать проект',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Инвалидируем запросы для обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });

      toast({
        title: 'Успешно!',
        description: `Проект "${variables.name}" создан`,
      });
    },
  });
}

/**
 * Хук для добавления комментария с оптимистичными обновлениями
 */
export function useAddComment(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: AddCommentInput) =>
      addComment(projectId, input),
    onMutate: async (newComment) => {
      // Отменяем любые исходящие запросы для комментариев этого проекта
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });

      // Сохраняем предыдущее состояние
      const previousComments = queryClient.getQueryData<ReviewComment[]>([
        'comments',
        projectId,
      ]);

      // Оптимистично добавляем новый комментарий
      const optimisticComment: ReviewComment = {
        id: `temp-${Date.now()}`, // Временный ID
        author: 'Текущий пользователь',
        authorInitials: 'ТП',
        timestamp: 'только что',
        line: newComment.line || 1,
        text: newComment.text,
        status: 'suggestion'
      };

      queryClient.setQueryData<ReviewComment[]>(
        ['comments', projectId],
        (old = []) => [optimisticComment, ...old]
      );

      // Возвращаем контекст для отката
      return { previousComments };
    },
    onError: (error, newComment, context) => {
      // Откатываем кеш к предыдущему состоянию
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }

      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить комментарий',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Инвалидируем запросы для обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });

      toast({
        title: 'Успешно!',
        description: 'Комментарий добавлен',
      });
    },
  });
}

/**
 * Хук для обновления статуса комментария
 */
export function useUpdateCommentStatus(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateCommentStatusInput }) =>
      updateCommentStatus(projectId, commentId, input),
    onMutate: async ({ commentId, input }) => {
      // Отменяем любые исходящие запросы для комментариев этого проекта
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });

      // Сохраняем предыдущее состояние
      const previousComments = queryClient.getQueryData<ReviewComment[]>([
        'comments',
        projectId,
      ]);

      // Оптимистично обновляем статус комментария
      queryClient.setQueryData<ReviewComment[]>(
        ['comments', projectId],
        (old = []) => old.map(comment => 
          comment.id === commentId 
            ? { ...comment, status: input.status }
            : comment
        )
      );

      // Возвращаем контекст для отката
      return { previousComments };
    },
    onError: (error, { commentId }, context) => {
      // Откатываем кеш к предыдущему состоянию
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }

      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус комментария',
        variant: 'destructive',
      });
    },
    onSuccess: (data, { input }) => {
      // Инвалидируем запросы для обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });

      const statusText = {
        'needs-fix': 'требует исправления',
        'suggestion': 'предложение',
        'resolved': 'решено'
      }[input.status];

      toast({
        title: 'Успешно!',
        description: `Статус комментария изменен на "${statusText}"`,
      });
    },
  });
}

/**
 * Хук для удаления комментария
 */
export function useDeleteComment(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(projectId, commentId),
    onMutate: async (commentId) => {
      // Отменяем любые исходящие запросы для комментариев этого проекта
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });

      // Сохраняем предыдущее состояние
      const previousComments = queryClient.getQueryData<ReviewComment[]>([
        'comments',
        projectId,
      ]);

      // Оптимистично удаляем комментарий
      queryClient.setQueryData<ReviewComment[]>(
        ['comments', projectId],
        (old = []) => old.filter(comment => comment.id !== commentId)
      );

      // Возвращаем контекст для отката
      return { previousComments };
    },
    onError: (error, commentId, context) => {
      // Откатываем кеш к предыдущему состоянию
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }

      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить комментарий',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      // Инвалидируем запросы для обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });

      toast({
        title: 'Успешно!',
        description: 'Комментарий удален',
      });
    },
  });
}
