export type SocialProvider = 'google' | 'facebook' | 'apple' | 'line';

export type SocialAuthPayload = {
  provider: SocialProvider;
  idToken?: string;
  accessToken?: string;
  authorizationCode?: string;
  redirectUri?: string;
  email?: string;
  name?: string;
};

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
    AppleID?: any;
  }
}

const SCRIPT_TIMEOUT_MS = 15000;
const loadedScriptPromises = new Map<string, Promise<void>>();

const loadScript = (src: string, id: string): Promise<void> => {
  if (loadedScriptPromises.has(id)) {
    return loadedScriptPromises.get(id)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;

    const timeout = window.setTimeout(() => {
      reject(new Error(`Timeout loading script: ${src}`));
    }, SCRIPT_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });

  loadedScriptPromises.set(id, promise);
  return promise;
};

const requireBrowser = () => {
  if (typeof window === 'undefined') {
    throw new Error('Social auth requires browser runtime');
  }
};

const getGoogleAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
  }

  await loadScript(
    'https://accounts.google.com/gsi/client',
    'google-gsi-client',
  );

  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google SDK not available');
  }

  const tokenResponse = await new Promise<any>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response: any) => {
        if (!response || response.error) {
          reject(new Error(response?.error_description || response?.error || 'Google auth failed'));
          return;
        }
        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });

  const accessToken = tokenResponse?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error('Google access token is missing');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    throw new Error(profile?.error_description || 'Failed to fetch Google profile');
  }

  return {
    provider: 'google',
    accessToken,
    email: profile.email,
    name: profile.name,
  };
};

const getFacebookAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
  if (!appId) {
    throw new Error('Missing VITE_FACEBOOK_APP_ID');
  }

  await new Promise<void>((resolve, reject) => {
    const init = () => {
      try {
        if (!window.FB) {
          reject(new Error('Facebook SDK not available'));
          return;
        }
        window.FB.init({
          appId,
          cookie: false,
          xfbml: false,
          version: 'v21.0',
        });
        resolve();
      } catch (error: any) {
        reject(new Error(error?.message || 'Failed to initialize Facebook SDK'));
      }
    };

    if (window.FB) {
      init();
      return;
    }

    window.fbAsyncInit = init;
    loadScript(
      'https://connect.facebook.net/en_US/sdk.js',
      'facebook-js-sdk',
    ).catch(reject);
  });

  const accessToken = await new Promise<string>((resolve, reject) => {
    window.FB.login(
      (response: any) => {
        const token = response?.authResponse?.accessToken as string | undefined;
        if (!token) {
          reject(new Error(response?.status === 'not_authorized'
            ? 'Facebook permission denied'
            : 'Facebook login cancelled'));
          return;
        }
        resolve(token);
      },
      { scope: 'email,public_profile' },
    );
  });

  const profile = await new Promise<any>((resolve, reject) => {
    window.FB.api(
      '/me',
      { fields: 'name,email' },
      (response: any) => {
        if (!response || response.error) {
          reject(new Error(response?.error?.message || 'Failed to fetch Facebook profile'));
          return;
        }
        resolve(response);
      },
    );
  });

  return {
    provider: 'facebook',
    accessToken,
    email: profile.email,
    name: profile.name,
  };
};

const getAppleAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  const redirectUri =
    (import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined) ||
    `${window.location.origin}/auth/apple/callback`;

  if (!clientId) {
    throw new Error('Missing VITE_APPLE_CLIENT_ID');
  }

  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
    'apple-js-sdk',
  );

  if (!window.AppleID?.auth) {
    throw new Error('Apple SDK not available');
  }

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI: redirectUri,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  const idToken = response?.authorization?.id_token as string | undefined;
  const authorizationCode = response?.authorization?.code as string | undefined;

  if (!idToken) {
    throw new Error('Apple id_token is missing');
  }

  const firstName = response?.user?.name?.firstName || '';
  const lastName = response?.user?.name?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    provider: 'apple',
    idToken,
    authorizationCode,
    email: response?.user?.email,
    name: fullName || undefined,
  };
};

const randomState = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const getLineAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const channelId = import.meta.env.VITE_LINE_CHANNEL_ID as string | undefined;
  if (!channelId) {
    throw new Error('Missing VITE_LINE_CHANNEL_ID');
  }

  const redirectUri =
    (import.meta.env.VITE_LINE_REDIRECT_URI as string | undefined) ||
    `${window.location.origin}${window.location.pathname}`;
  const state = randomState(24);
  const nonce = randomState(24);

  const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', channelId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'profile openid email');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('bot_prompt', 'normal');

  const popup = window.open(authUrl.toString(), 'line_oauth', 'width=520,height=700');
  if (!popup) {
    throw new Error('Popup blocked. Please allow popups for LINE login.');
  }

  const result = await new Promise<SocialAuthPayload>((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 120000;
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        reject(new Error('LINE login cancelled'));
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        popup.close();
        window.clearInterval(timer);
        reject(new Error('LINE login timeout'));
        return;
      }

      let href: string;
      try {
        href = popup.location.href;
      } catch {
        return;
      }

      if (!href || !href.startsWith(redirectUri)) return;

      const url = new URL(href);
      const returnedState = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      const error = url.searchParams.get('error') || '';
      const errorDescription = url.searchParams.get('error_description') || '';

      popup.close();
      window.clearInterval(timer);

      if (error) {
        reject(new Error(`LINE login failed: ${errorDescription || error}`));
        return;
      }
      if (!code) {
        reject(new Error('LINE authorization code is missing'));
        return;
      }
      if (returnedState !== state) {
        reject(new Error('LINE state mismatch'));
        return;
      }

      resolve({
        provider: 'line',
        authorizationCode: code,
        redirectUri,
      });
    }, 400);
  });

  return result;
};

export const startSocialWebAuth = async (
  provider: SocialProvider,
): Promise<SocialAuthPayload> => {
  switch (provider) {
    case 'google':
      return getGoogleAuth();
    case 'facebook':
      return getFacebookAuth();
    case 'apple':
      return getAppleAuth();
    case 'line':
      return getLineAuth();
    default:
      throw new Error(`Unsupported social provider: ${provider}`);
  }
};
