import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Project } from "../lib/types";

interface DeleteProjectDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectId: string) => void;
  isLoading?: boolean;
}

export function DeleteProjectDialog({
  project,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteProjectDialogProps) {
  if (!project) return null;

  const handleConfirm = () => {
    onConfirm(project.id);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить проект</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить проект <strong>"{project.name}"</strong>?
            <br />
            <br />
            Это действие нельзя отменить. Будут удалены:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Все файлы проекта</li>
              <li>Все комментарии и отзывы</li>
              <li>История прогонов</li>
              <li>Все связанные данные</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? "Удаляем..." : "Удалить проект"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
