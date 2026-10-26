import { toast } from 'sonner';

export const AUTH_ERROR_EVENT = 'greencrop:auth-error';
export type AuthErrorDetail = { title: string; description?: string; fields?: string[] };

export function reportAuthError(title: string, options: { description?: string; fields?: string[] } = {}) {
  const event = new CustomEvent<AuthErrorDetail>(AUTH_ERROR_EVENT, {
    detail: { title, description: options.description, fields: options.fields },
    cancelable: true,
  });
  // An open auth form handles the error in place; other pages retain normal toasts.
  if (window.dispatchEvent(event)) toast.error(title, options);
}
