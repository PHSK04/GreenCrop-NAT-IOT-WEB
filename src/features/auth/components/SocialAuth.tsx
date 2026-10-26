import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { reportAuthError } from "../services/authError";
import { consumeLineOAuthCallback, consumeMicrosoftOAuthCallback, startSocialWebAuth } from "../services/socialWebAuth";

// --- Brand Icons ---

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.2-.2-1.72H12v3.3h5.37a4.6 4.6 0 0 1-2 2.94v2.14h3.25c1.9-1.75 2.73-4.34 2.73-6.66Z" />
    <path fill="#34A853" d="M12 21.7c2.72 0 5-.9 6.62-2.44l-3.25-2.54c-.9.6-2.06.96-3.37.96-2.62 0-4.84-1.77-5.64-4.15H3v2.2A10 10 0 0 0 12 21.7Z" />
    <path fill="#FBBC05" d="M6.36 13.53A6 6 0 0 1 6.05 12c0-.53.1-1.04.3-1.53v-2.2H3A10 10 0 0 0 2 12c0 1.35.32 2.62 1 3.73l3.36-2.2Z" />
    <path fill="#EA4335" d="M12 6.32c1.48 0 2.8.5 3.84 1.5l2.86-2.87A9.6 9.6 0 0 0 12 2.3a10 10 0 0 0-9 5.97l3.36 2.2C7.16 8.09 9.38 6.32 12 6.32Z" />
  </svg>
);

const MicrosoftIcon = () => (
   <svg viewBox="0 0 23 23" className="w-5 h-5" aria-hidden="true"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
);

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const LineIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#06C755" />
        <path
            d="M16.8 10.8c0-2.2-2.1-3.9-4.8-3.9s-4.8 1.7-4.8 3.9c0 2 1.7 3.6 4.1 3.9l-.2 1.7c0 .1.1.2.2.1l1.9-1.4c2.1-.4 3.6-2 3.6-4.3z"
            fill="#fff"
        />
    </svg>
);


type Provider = 'Google' | 'Microsoft' | 'LINE' | 'Facebook';
interface SocialAuthProps {
  onLoginSuccess?: () => void;
  actionText?: string;
  dividerLabel?: string;
  showDivider?: boolean;
  providers?: Provider[];
  tone?: 'default' | 'light' | 'dark';
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}
const configured: Record<Provider, boolean> = {
  Google: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()),
  Microsoft: Boolean(import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim()),
  LINE: Boolean(import.meta.env.VITE_LINE_CHANNEL_ID?.trim()),
  Facebook: Boolean(import.meta.env.VITE_FACEBOOK_APP_ID?.trim()),
};
const icons = { Google: GoogleIcon, Microsoft: MicrosoftIcon, LINE: LineIcon, Facebook: FacebookIcon };
export function SocialAuth({ onLoginSuccess, actionText = 'เข้าสู่ระบบ', dividerLabel, showDivider = true, providers = ['Google', 'Microsoft', 'LINE', 'Facebook'], disabled = false, onBusyChange }: SocialAuthProps) {
  const { socialLogin } = useAuth();
  const [loading, setLoading] = useState<Provider | null>(null);
  const pending = useRef(false);
  const available = providers.filter(provider => configured[provider]);
  const setBusy = (provider: Provider | null) => { pending.current = !!provider; setLoading(provider); onBusyChange?.(!!provider); };
  useEffect(() => {
    // Redirect callbacks are consumed once, including when the modal opens after OAuth.
    const complete = async () => {
      try {
        const line = consumeLineOAuthCallback();
        const microsoft = line ? null : consumeMicrosoftOAuthCallback();
        const payload = line || microsoft;
        if (!payload) return;
        setBusy(line ? 'LINE' : 'Microsoft');
        await socialLogin(line ? 'LINE' : 'Microsoft', payload);
        onLoginSuccess?.();
      } catch (error) {
        reportAuthError('เข้าสู่ระบบไม่สำเร็จ', { description: error instanceof Error ? error.message : 'กรุณาลองอีกครั้ง' });
      } finally { setBusy(null); }
    };
    void complete();
  }, []);
  const start = async (provider: Provider) => {
    if (pending.current || disabled) return;
    setBusy(provider);
    try {
      const payload = await startSocialWebAuth(provider.toLowerCase() as 'google' | 'microsoft' | 'line' | 'facebook');
      await socialLogin(provider, payload);
      onLoginSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'กรุณาลองอีกครั้ง';
      if (!message.endsWith('_AUTH_REDIRECT')) reportAuthError('เข้าสู่ระบบไม่สำเร็จ', { description: message });
    } finally { setBusy(null); }
  };
  if (!available.length) return null;
  return <div className="space-y-4">
    {showDivider && <p className="text-center text-sm text-slate-500">{dividerLabel || `หรือ${actionText}ด้วย`}</p>}
    <div className="grid grid-cols-2 gap-3">
      {available.map(provider => { const Icon = icons[provider]; return <Button key={provider} type="button" variant="outline" className="h-[60px] rounded-xl border-slate-200 bg-white text-base text-slate-700 hover:bg-emerald-50 disabled:opacity-60" disabled={disabled || !!loading} onClick={() => void start(provider)} aria-label={`${actionText}ด้วย ${provider}`} aria-busy={loading === provider}>
        {loading === provider ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon />}<span className="ml-2">{provider}</span>
      </Button>; })}
    </div>
  </div>;
}
