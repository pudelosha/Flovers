import type { TFunction } from 'i18next';

export function withCompletionXP(message: string, xp: number, t: TFunction): string {
  if (!Number.isFinite(xp) || xp <= 0) return message;
  return `${message} · ${t('home.toasts.xpGained', { xp, defaultValue: '+{{xp}} XP' })}`;
}

export function taskCompletionToast(t: TFunction, xp: number, multiple = false): string {
  const message = String(t(multiple ? 'home.toasts.tasksCompleted' : 'home.toasts.taskCompleted', {
    defaultValue: multiple ? 'Tasks completed' : 'Task completed',
  }));
  return withCompletionXP(message, xp, t);
}
