export type SocialProvider = 'google' | 'facebook' | 'apple' | 'line' | 'microsoft';

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
const OAUTH_POPUP_NAME = 'line_oauth';
const LINE_STATE_KEY = 'line_oauth_state';
const LINE_REDIRECT_KEY = 'line_oauth_redirect_uri';
const MS_STATE_KEY = 'ms_oauth_state';
const MS_REDIRECT_KEY = 'ms_oauth_redirect_uri';

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

const normalizeUrlPath = (value: string): string => {
  try {
    const url = new URL(value);
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.origin}${normalizedPath}`;
  } catch {
    return value.replace(/\/+$/, '');
  }
};

const persistLineFlow = (state: string, redirectUri: string) => {
  try {
    sessionStorage.setItem(LINE_STATE_KEY, state);
    sessionStorage.setItem(LINE_REDIRECT_KEY, redirectUri);
  } catch {
    // Ignore storage issues and continue.
  }
};

const clearLineFlow = () => {
  try {
    sessionStorage.removeItem(LINE_STATE_KEY);
    sessionStorage.removeItem(LINE_REDIRECT_KEY);
  } catch {
    // Ignore storage issues and continue.
  }
};

const readLineFlow = () => {
  try {
    return {
      expectedState: sessionStorage.getItem(LINE_STATE_KEY) || '',
      redirectUri: sessionStorage.getItem(LINE_REDIRECT_KEY) || '',
    };
  } catch {
    return { expectedState: '', redirectUri: '' };
  }
};

export const consumeLineOAuthCallback = (): SocialAuthPayload | null => {
  requireBrowser();

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code') || '';
  const returnedState = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error') || '';
  const errorDescription = url.searchParams.get('error_description') || '';

  if (!code && !error) return null;

  const { expectedState, redirectUri } = readLineFlow();

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

  clearLineFlow();

  if (error) {
    throw new Error(`LINE login failed: ${errorDescription || error}`);
  }
  if (!code) {
    throw new Error('LINE authorization code is missing');
  }
  if (!expectedState || returnedState !== expectedState) {
    throw new Error('LINE state mismatch');
  }
  if (!redirectUri) {
    throw new Error('LINE redirect URI is missing');
  }

  return {
    provider: 'line',
    authorizationCode: code,
    redirectUri,
  };
};

const persistMicrosoftFlow = (state: string, redirectUri: string) => {
  try {
    sessionStorage.setItem(MS_STATE_KEY, state);
    sessionStorage.setItem(MS_REDIRECT_KEY, redirectUri);
  } catch {
    // Ignore storage issues and continue.
  }
};

const clearMicrosoftFlow = () => {
  try {
    sessionStorage.removeItem(MS_STATE_KEY);
    sessionStorage.removeItem(MS_REDIRECT_KEY);
  } catch {
    // Ignore storage issues and continue.
  }
};

const readMicrosoftFlow = () => {
  try {
    return {
      expectedState: sessionStorage.getItem(MS_STATE_KEY) || '',
      redirectUri: sessionStorage.getItem(MS_REDIRECT_KEY) || '',
    };
  } catch {
    return { expectedState: '', redirectUri: '' };
  }
};

export const consumeMicrosoftOAuthCallback = (): SocialAuthPayload | null => {
  requireBrowser();

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code') || '';
  const returnedState = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error') || '';
  const errorDescription = url.searchParams.get('error_description') || '';

  const { expectedState, redirectUri } = readMicrosoftFlow();
  if (!expectedState) return null;
  if (!code && !error) return null;

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

  clearMicrosoftFlow();

  if (error) {
    throw new Error(`Microsoft login failed: ${errorDescription || error}`);
  }
  if (!code) {
    throw new Error('Microsoft authorization code is missing');
  }
  if (!expectedState || returnedState !== expectedState) {
    throw new Error('Microsoft state mismatch');
  }
  if (!redirectUri) {
    throw new Error('Microsoft redirect URI is missing');
  }

  return {
    provider: 'microsoft',
    authorizationCode: code,
    redirectUri,
  };
};

const getMicrosoftAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const clientId = (import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined)?.trim();
  if (!clientId) {
    throw new Error('Missing VITE_MICROSOFT_CLIENT_ID');
  }
  const tenantId = (import.meta.env.VITE_MICROSOFT_TENANT_ID as string | undefined)?.trim() || 'common';
  const redirectUri =
    (import.meta.env.VITE_MICROSOFT_REDIRECT_URI as string | undefined)?.trim() ||
    `${window.location.origin}${window.location.pathname}`;

  const state = randomState(24);
  persistMicrosoftFlow(state, redirectUri);

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', 'openid profile email User.Read');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const popup = window.open(authUrl.toString(), 'ms_oauth', 'width=520,height=700');
  if (!popup) {
    window.location.assign(authUrl.toString());
    throw new Error('MICROSOFT_AUTH_REDIRECT');
  }

  const expectedCallback = normalizeUrlPath(redirectUri);

  const result = await new Promise<SocialAuthPayload>((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 120000;

    const cleanup = () => {
      window.clearInterval(timer);
    };

    const parseAndResolve = (params: URLSearchParams) => {
      const returnedState = params.get('state') || '';
      const code = params.get('code') || '';
      const error = params.get('error') || '';
      const errorDescription = params.get('error_description') || '';

      clearMicrosoftFlow();
      if (error) {
        reject(new Error(`Microsoft login failed: ${errorDescription || error}`));
        return;
      }
      if (!code) {
        reject(new Error('Microsoft authorization code is missing'));
        return;
      }
      if (returnedState !== state) {
        reject(new Error('Microsoft state mismatch'));
        return;
      }

      resolve({
        provider: 'microsoft',
        authorizationCode: code,
        redirectUri,
      });
    };

    const timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Microsoft login cancelled'));
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        popup.close();
        cleanup();
        reject(new Error('Microsoft login timeout'));
        return;
      }

      let href: string;
      try {
        href = popup.location.href;
      } catch {
        return;
      }

      if (!href) return;
      const url = new URL(href);
      const currentCallback = normalizeUrlPath(url.toString());
      if (currentCallback !== expectedCallback) return;

      popup.close();
      cleanup();
      parseAndResolve(url.searchParams);
    }, 400);
  });

  return result;
};

const getLineAuth = async (): Promise<SocialAuthPayload> => {
  requireBrowser();
  const channelId = import.meta.env.VITE_LINE_CHANNEL_ID as string | undefined;
  if (!channelId) {
    throw new Error('Missing VITE_LINE_CHANNEL_ID');
  }

  const redirectUri = (import.meta.env.VITE_LINE_REDIRECT_URI as string | undefined)?.trim();
  if (!redirectUri) {
    throw new Error('Missing VITE_LINE_REDIRECT_URI');
  }
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
  persistLineFlow(state, redirectUri);

  const popup = window.open(authUrl.toString(), OAUTH_POPUP_NAME, 'width=520,height=700');
  if (!popup) {
    window.location.assign(authUrl.toString());
    throw new Error('LINE_AUTH_REDIRECT');
  }

  const expectedCallback = normalizeUrlPath(redirectUri);

  const result = await new Promise<SocialAuthPayload>((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 120000;

    const cleanup = () => {
      window.clearInterval(timer);
      window.removeEventListener('message', onMessage);
    };

    const parseAndResolve = (params: URLSearchParams) => {
      const returnedState = params.get('state') || '';
      const code = params.get('code') || '';
      const error = params.get('error') || '';
      const errorDescription = params.get('error_description') || '';

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
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data: any = event.data || {};
      if (data?.type !== 'LINE_OAUTH_RESULT') return;

      cleanup();
      try {
        parseAndResolve(new URLSearchParams(String(data.query || '')));
      } catch (err: any) {
        reject(new Error(err?.message || 'LINE login callback parse failed'));
      }
    };

    window.addEventListener('message', onMessage);

    const timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('LINE login cancelled'));
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        popup.close();
        cleanup();
        reject(new Error('LINE login timeout'));
        return;
      }

      let href: string;
      try {
        href = popup.location.href;
      } catch {
        return;
      }

      if (!href) return;

      const url = new URL(href);
      const currentCallback = normalizeUrlPath(url.toString());
      if (currentCallback !== expectedCallback) return;

      popup.close();
      cleanup();
      parseAndResolve(url.searchParams);
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
    case 'microsoft':
      return getMicrosoftAuth();
    default:
      throw new Error(`Unsupported social provider: ${provider}`);
  }
};
