
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";
import { startSocialWebAuth } from "../services/socialWebAuth";

// --- Constants ---
const FACEBOOK_APP_ID = "1585600402556361"; // Facebook App ID

// --- Brand Icons ---

const GoogleIcon = () => (
   <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
         d="M21.805 10.023h-9.8v3.955h5.62c-.48 2.52-2.62 3.955-5.62 3.955-3.33 0-6.04-2.79-6.04-6.23s2.71-6.23 6.04-6.23c1.89 0 3.13.8 3.85 1.47l2.63-2.71c-1.69-1.6-3.88-2.58-6.48-2.58-5.32 0-9.63 4.43-9.63 9.89s4.31 9.89 9.63 9.89c5.56 0 9.24-3.95 9.24-9.5 0-.64-.06-1.1-.14-1.91z"
         fill="#4285F4"
      />
      <path
         d="M3.59 7.35l3.25 2.45c.88-2.67 2.84-4.33 5.17-4.33 1.89 0 3.13.8 3.85 1.47l2.63-2.71c-1.69-1.6-3.88-2.58-6.48-2.58-3.7 0-6.94 2.17-8.42 5.7z"
         fill="#EA4335"
      />
      <path
         d="M12 21.43c2.54 0 4.69-.86 6.26-2.47l-2.9-2.4c-.87.62-1.96 1.37-3.36 1.37-2.98 0-5.14-1.92-5.62-4.5l-3.22 2.52c1.46 3.58 4.77 5.48 8.84 5.48z"
         fill="#34A853"
      />
      <path
         d="M6.38 13.43a6.42 6.42 0 0 1 0-3.96L3.16 6.95a10.23 10.23 0 0 0 0 9l3.22-2.52z"
         fill="#FBBC05"
      />
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

interface SocialAuthProps {
    onLoginSuccess?: () => void;
    actionText?: string;
    showDivider?: boolean;
}

export function SocialAuth({
    onLoginSuccess,
    actionText = "register",
    showDivider = true,
}: SocialAuthProps) {
    const { socialLogin } = useAuth();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // Initialize Facebook SDK
    useEffect(() => {
        // Load the SDK asynchronously
        (function(d, s, id) {
             const fjs = d.getElementsByTagName(s)[0];
             if (d.getElementById(id)) {return;}
             const js = d.createElement(s) as HTMLScriptElement;
             js.id = id;
             js.src = "https://connect.facebook.net/en_US/sdk.js";
             if (fjs && fjs.parentNode) {
                 fjs.parentNode.insertBefore(js, fjs);
             } else {
                 d.head.appendChild(js);
             }
        }(document, 'script', 'facebook-jssdk'));

        (window as any).fbAsyncInit = function() {
            (window as any).FB.init({
              appId      : FACEBOOK_APP_ID,
              cookie     : true,
              xfbml      : true,
              version    : 'v18.0'
            });
        };
    }, []);

    const handleFacebookLogin = () => {
        setIsLoading('Facebook');
        if (!(window as any).FB) {
            toast.error("Facebook SDK not loaded yet.");
            setIsLoading(null);
            return;
        }

        (window as any).FB.login((response: any) => {
            if (response.authResponse) {
                // User authorized app
                const accessToken = response.authResponse.accessToken;
                console.log('Facebook Access Token:', accessToken);
                
                // Call Auth Service with token
                socialLogin('Facebook', { accessToken })
                    .then(() => {
                        if (onLoginSuccess) onLoginSuccess();
                    })
                    .catch((err) => {
                        toast.error("Login failed: " + err.message);
                    })
                    .finally(() => setIsLoading(null));
            } else {
                // User cancelled or failed
                console.log('User cancelled login or did not fully authorize.');
                setIsLoading(null);
            }
        }, { scope: 'public_profile,email' });
    };

    const handleGoogleLogin = async () => {
        setIsLoading('Google');
        try {
            const payload = await startSocialWebAuth('google');
            await socialLogin('Google', {
                accessToken: payload.accessToken,
                idToken: payload.idToken,
                email: payload.email,
                name: payload.name,
            });
            if (onLoginSuccess) onLoginSuccess();
        } catch (err: any) {
            toast.error("Google Login Failed", { description: err?.message || "Unknown error" });
        } finally {
            setIsLoading(null);
        }
    };

    const handleMockLogin = async (provider: string) => {
        setIsLoading(provider);
        toast.info(`กำลังเชื่อมต่อกับ ${provider}...`);
        try {
            await socialLogin(provider); 
            if (onLoginSuccess) onLoginSuccess();
        } catch (error) {
            // Error handled in context
        } finally {
            setIsLoading(null);
        }
    };

    const socialButtonBase =
        "group relative h-14 w-full overflow-hidden rounded-2xl border transition-all duration-200 disabled:opacity-60 " +
        "border-slate-200 bg-white text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:border-emerald-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)] " +
        "dark:border-emerald-600/35 dark:bg-gradient-to-b dark:from-[#05211b] dark:to-[#031914] dark:text-emerald-50 " +
        "dark:shadow-[inset_0_1px_0_rgba(52,211,153,0.15),0_10px_30px_rgba(2,18,14,0.5)] dark:hover:border-emerald-400/60 dark:hover:shadow-[inset_0_1px_0_rgba(110,231,183,0.25),0_14px_36px_rgba(2,18,14,0.7)]";

    return (
        <div className="pt-2 text-center space-y-4">
            {showDivider ? (
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-300/80 dark:border-slate-700/80" />
                    </div>
                    <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.12em]">
                        <span className="bg-white/95 px-3 text-slate-500 dark:bg-slate-900/95 dark:text-slate-300">
                            Or {actionText} with
                        </span>
                    </div>
                </div>
            ) : null}
            
            <div className="grid grid-cols-2 gap-4">
                <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleGoogleLogin}
                    className={socialButtonBase}
                    disabled={!!isLoading}
                >
                    <div className="absolute inset-0 bg-emerald-400/0 transition-colors duration-300 group-hover:bg-emerald-500/5 dark:group-hover:bg-emerald-300/5" />
                    <GoogleIcon />
                    <span className="ml-3 text-[1.05rem] font-semibold tracking-tight">Google</span>
                </Button>
                
                <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleMockLogin('Microsoft')}
                    className={socialButtonBase}
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-emerald-400/0 transition-colors duration-300 group-hover:bg-emerald-500/5 dark:group-hover:bg-emerald-300/5" />
                    <MicrosoftIcon />
                    <span className="ml-3 text-[1.05rem] font-semibold tracking-tight">Microsoft</span>
                </Button>

                <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleMockLogin('LINE')}
                    className={socialButtonBase}
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-emerald-400/0 transition-colors duration-300 group-hover:bg-emerald-500/5 dark:group-hover:bg-emerald-300/5" />
                    <LineIcon />
                    <span className="ml-3 text-[1.05rem] font-semibold tracking-tight">LINE</span>
                </Button>

                <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleFacebookLogin}
                    className={socialButtonBase}
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-emerald-400/0 transition-colors duration-300 group-hover:bg-emerald-500/5 dark:group-hover:bg-emerald-300/5" />
                    <FacebookIcon />
                    <span className="ml-3 text-[1.05rem] font-semibold tracking-tight">Facebook</span>
                </Button>
            </div>
        </div>
    );
}
