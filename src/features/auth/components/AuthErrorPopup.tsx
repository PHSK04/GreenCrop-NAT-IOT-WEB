import { explainAuthError } from '../services/authErrorMessage';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { AUTH_ERROR_EVENT, type AuthErrorDetail } from '../services/authError';

// Inline feedback stays in the form so users can correct their input immediately.
export function AuthErrorPopup() {
  const [error, setError] = useState<AuthErrorDetail | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const id = useRef(`auth-feedback-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const form = anchor.current?.closest('form');
    let lastVibration = 0;
    const clearFields = () => {
      form?.querySelectorAll<HTMLInputElement>('[data-auth-invalid]').forEach((input) => {
        input.removeAttribute('aria-invalid');
        const previous = input.getAttribute('data-auth-description');
        if (previous) input.setAttribute('aria-describedby', previous); else input.removeAttribute('aria-describedby');
        input.removeAttribute('data-auth-description');
        input.removeAttribute('data-auth-invalid');
      });
    };
    const onError = (event: Event) => {
      const notification = event as CustomEvent<AuthErrorDetail>;
      notification.preventDefault();
      setError(notification.detail);
      clearFields();
      const text = `${notification.detail.title} ${notification.detail.description || ''}`.toLowerCase();
      const names = notification.detail.fields || (/invalid credentials|incorrect password|user not found/.test(text) ? ['email', 'password']
        : /ไม่ตรงกัน/.test(text) ? ['password', 'confirmPassword'] : /เบอร์โทร/.test(text) ? ['phone'] : /email already|already registered/.test(text) ? ['email'] : /รหัสผ่านต้อง/.test(text) ? ['password'] : []);
      form?.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
        if (names.includes(input.name) || !input.validity.valid) {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('data-auth-description', input.getAttribute('aria-describedby') || '');
          input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${id.current}`.trim());
          input.setAttribute('data-auth-invalid', 'true');
        }
      });
      anchor.current?.scrollIntoView({ block: 'nearest' });
      if (Date.now() - lastVibration >= 800) {
        lastVibration = Date.now();
        try { navigator.vibrate?.([80, 60, 80]); } catch { /* Unsupported devices retain visual feedback. */ }
      }
    };
    const onInput = () => { setError(null); clearFields(); };
    form?.addEventListener('input', onInput);
    window.addEventListener(AUTH_ERROR_EVENT, onError);
    return () => {
      form?.removeEventListener('input', onInput);
      window.removeEventListener(AUTH_ERROR_EVENT, onError);
      clearFields();
      try { navigator.vibrate?.(0); } catch { /* Optional hardware. */ }
    };
  }, []);

  const message = error ? explainAuthError(error) : null;
  return (
    <div ref={anchor}>
      {message && <section id={id.current} role="alert" aria-atomic="true" className="mb-5 overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-[0_6px_24px_-12px_rgba(159,18,57,0.22)]">
        <div className="flex items-start gap-3 bg-white p-4 sm:gap-4 sm:p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose-200/70 bg-white text-rose-600 shadow-[0_3px_10px_rgba(225,29,72,0.08)]">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-rose-600">{message.title}</p>
            <p className="break-words text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">{message.reason}</p>
          </div>
        </div>
        <div className="mx-4 flex items-start gap-2.5 border-t border-slate-100 py-3.5 sm:mx-5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-600">{message.help}</p>
        </div>
      </section>}

    </div>
  );
}
