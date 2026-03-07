
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

// --- Constants ---
const FACEBOOK_APP_ID = "1585600402556361"; // Facebook App ID

// --- Brand Icons ---

const GoogleIcon = () => (
   <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 20.45c4.6667 0 7.9733-3.2533 7.9733-8.16 0-.6933-.08-1.5467-.1866-2.08H12.0003v3.8933h4.64C16.3203 15.68 14.667 17.52 12.0003 17.52c-3.1467 0-5.7867-2.1867-6.72-5.12H1.9736v3.1733C3.9203 19.3333 7.6803 20.45 12.0003 20.45z" fill="#34A853"/><path d="M5.2803 12.4c-.24-.7467-.3733-1.5467-.3733-2.4s.1333-1.6533.3733-2.4V4.4267H1.9736C1.1736 6.0267.7203 7.92.7203 10s.4533 3.9733 1.2533 5.5733l3.3067-3.1733z" fill="#FBBC05"/><path d="M12.0003 6.48c2.16 0 3.8667.9067 5.0667 2.0533l2.88-2.88C18.187 3.84 15.3603 2.4 12.0003 2.4 7.6803 2.4 3.9203 3.52 1.9736 7.4267l3.3067 3.1733C6.2136 7.68 8.8536 5.4933 12.0003 5.4933c.48 0 .96.0533 1.4133.16.4533.1067.88.2933 1.28.5333l-1.92 1.92c-.2133.2133-.5067.32-.8.32-.5867 0-1.0667-.48-1.0667-1.0667 0-.5867.48-1.0667 1.0667-1.0667z" fill="#EA4335"/><path d="M12.0003 2.4c-4.32 0-8.08 1.12-10.0267 5.0267l3.3067 3.1733c.9333-2.9333 3.5733-5.12 6.72-5.12 2.6667 0 4.32 1.84 4.64 3.3867h4.64C19.9736 5.6533 16.667 2.4 12.0003 2.4z" fill="#EA4335"/></svg>
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
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="#06C755">
        <path d="M20.6 10c0-4.6-4.6-8-10.6-8S-.6 5.4-.6 10c0 4 3.5 7.3 8.8 7.9.3.1.8.2.9.6.1.3 0 .8-.1.9-1.3 3.9-.2 4.2 2.3 2.3 3.3-2.5 9-6.9 8.7-11.7z" transform="translate(1.6 2) scale(0.9)"/>
        {/* Simplified Line Icon Path logic for cleaner SVG */}
        <path d="M24 10.3c0-5-5-9.1-11.7-9.1C5.7 1.2.9 5.2.9 10.3c0 4.5 3.6 8.3 8.3 9l.3 2.6c0 .2-.1.5 0 .7.1.3.4.4.8.2L16 19c4.3-1.6 8-4.9 8-8.7zm-16.7 3.5c-.5 0-.9-.4-.9-.9v-4c0-.5.4-.9.9-.9s.9.4.9.9v4c0 .5-.4.9-.9.9zm4.2 0c-.5 0-.9-.4-.9-.9v-4c0-.5.4-.9.9-.9s.9.4.9.9v4c0 .5-.4.9-.9.9zm4.2 0c-.5 0-.9-.4-.9-.9v-4c0-.5.4-.9.9-.9s.9.4.9.9v4c0 .5-.4.9-.9.9zm3.3-2.9h-2.4c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h2.4c.2 0 .4.2.4.4s-.2.4-.4.4z" fill="#06C755" transform="scale(0.8) translate(5, 5)"/>
        <text x="12" y="23" fontSize="0" fill="none">Line</text>
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
                socialLogin('Facebook', accessToken)
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
            
            <div className="grid grid-cols-2 gap-3">
                <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleMockLogin('Google Workspace')}
                    className="group relative h-11 w-full overflow-hidden rounded-xl border border-slate-300/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
                    disabled={!!isLoading}
                >
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors duration-300" />
                    <GoogleIcon />
                    <span className="ml-2 font-medium">Google</span>
                </Button>
                
                <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleMockLogin('Microsoft Azure')}
                    className="group relative h-11 w-full overflow-hidden rounded-xl border border-slate-300/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-300" />
                    <MicrosoftIcon />
                    <span className="ml-2 font-medium">Azure</span>
                </Button>

                <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleMockLogin('LINE')}
                    className="group relative h-11 w-full overflow-hidden rounded-xl border border-slate-300/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-[#06C755]/0 group-hover:bg-[#06C755]/5 transition-colors duration-300" />
                    <LineIcon />
                    <span className="ml-2 font-medium">LINE</span>
                </Button>

                <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleFacebookLogin}
                    className="group relative h-11 w-full overflow-hidden rounded-xl border border-slate-300/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
                    disabled={!!isLoading}
                >
                     <div className="absolute inset-0 bg-[#1877F2]/0 group-hover:bg-[#1877F2]/5 transition-colors duration-300" />
                    <FacebookIcon />
                    <span className="ml-2 font-medium">Facebook</span>
                </Button>
            </div>
        </div>
    );
}
