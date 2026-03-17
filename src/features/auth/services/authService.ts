export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: number;
  location?: string;
  bio?: string;
  avatar?: string;
  title?: string;
  notes?: string;
  plain_password?: string;
}

export interface SocialLoginPayload {
  accessToken?: string;
  idToken?: string;
  email?: string;
  name?: string;
  avatar?: string;
  authorizationCode?: string;
  redirectUri?: string;
}

export interface AdminDbSummary {
  users: number;
  login_sessions: number;
  sensor_data: number;
  audit_logs: number;
  otp_codes: number;
}

export interface AdminDbUserRow {
  id: string | number;
  name: string;
  email: string;
  role: string;
  location?: string;
  bio?: string;
  title?: string;
  notes?: string;
  plain_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminDbSessionRow {
  id: string | number;
  user_id?: string | number;
  user_name?: string;
  user_email?: string;
  device_type?: string;
  device_name?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  login_time?: string;
  logout_time?: string;
  status?: string;
}

export interface AdminDbSensorRow {
  id: string | number;
  tenant_id?: string;
  device_id?: string;
  sensor_id?: string;
  pressure?: number;
  flow_rate?: number;
  ec_value?: number;
  active_tank?: number;
  is_on?: boolean;
  uptime_seconds?: number;
  timestamp?: string;
}

export interface AdminDbAuditRow {
  id: string | number;
  user_name?: string;
  action?: string;
  device?: string;
  status?: string;
  details?: string;
  timestamp?: string;
}

export interface AdminDbOtpRow {
  id: string | number;
  contact?: string;
  expires_at?: string;
  created_at?: string;
}

export interface AdminDbDeviceRow {
  id: string | number;
  user_id?: string | number;
  user_email?: string;
  device_id?: string;
  device_name?: string;
  location?: string;
  pairing_code?: string;
  status?: string;
  created_at?: string;
  paired_at?: string;
  last_seen?: string;
  is_primary?: boolean;
  updated_at?: string;
}

export interface AdminDbUserDetails {
  user: AdminDbUserRow;
  sessions: AdminDbSessionRow[];
  sensor_data: AdminDbSensorRow[];
  audit_logs: AdminDbAuditRow[];
  devices?: AdminDbDeviceRow[];
}

export interface AdminDbQuery {
  q?: string;
  userId?: string | number;
  status?: string;
  action?: string;
  role?: string;
  deviceType?: string;
  deviceId?: string;
  sensorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const SESSION_KEY = 'smart_iot_session';
const isGithubPagesRuntime =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const REQUEST_TIMEOUT_MS = isGithubPagesRuntime ? 65000 : 12000;

type SessionPayload = {
  token?: string;
  user?: Partial<User> & { id?: string | number; role?: string; created_at?: number | string };
} | null;

const normalizeUser = (raw: any): User | null => {
  if (!raw) return null;
  const candidate = raw.user ?? raw;
  if (candidate.id === undefined || !candidate.email) return null;

  const role = String(candidate.role || '').toLowerCase();

  return {
    id: String(candidate.id),
    email: String(candidate.email),
    name: String(candidate.name || candidate.email),
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: Number(candidate.createdAt ?? candidate.created_at ?? Date.now()),
    location: candidate.location,
    bio: candidate.bio,
    avatar: candidate.avatar,
    title: candidate.title,
    notes: candidate.notes,
    plain_password: candidate.plain_password,
  };
};

const readSession = (): { token: string; user: User | null } => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    const legacyToken =
      localStorage.getItem('smart_iot_token') ||
      localStorage.getItem('auth_token') ||
      '';
    return { token: legacyToken, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as SessionPayload | User;
    const token =
      (parsed as any)?.token ||
      (parsed as any)?.user?.token ||
      (parsed as any)?.accessToken ||
      localStorage.getItem('smart_iot_token') ||
      localStorage.getItem('auth_token') ||
      '';
    const user = normalizeUser((parsed as any)?.user ?? parsed);
    return { token, user };
  } catch {
    const legacyToken =
      localStorage.getItem('smart_iot_token') ||
      localStorage.getItem('auth_token') ||
      '';
    return { token: legacyToken, user: null };
  }
};

const writeSession = (payload: { token?: string; user: User }) => {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: payload.token || '',
      user: payload.user,
    }),
  );
};

const getAuthHeaders = () => {
  const { token } = readSession();
  if (token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }
  return { 'Content-Type': 'application/json' };
};

const buildApiUrl = (path: string) => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${safePath}`;
};

const toQueryString = (query?: AdminDbQuery): string => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : '';
};

const fetchWithApiFallback = async (
  path: string,
  init: RequestInit,
): Promise<Response> => {
  if (isGithubPagesRuntime && API_URL === '/api') {
    throw new Error('Production API is not configured. Set VITE_API_URL in GitHub Actions secrets.');
  }
  try {
    return await fetch(buildApiUrl(path), init);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Failed to fetch' || error.message.includes('connect'))) {
      throw new Error('Cannot connect to server/DB');
    }
    throw error;
  }
};

const throwHttpError = async (response: Response, fallbackMessage: string): Promise<never> => {
  let serverMessage = '';
  try {
    const data = await response.json();
    serverMessage = data?.error || data?.message || '';
  } catch {
    // ignore parse error, fallback to status text below
  }
  const detail = serverMessage || response.statusText || fallbackMessage;
  throw new Error(`${detail} (${response.status})`);
};

export const authService = {
  // Login via API (DB-backed)
  login: async (email: string, password: string): Promise<User> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchWithApiFallback('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const normalizedUser = normalizeUser(data);
      if (!normalizedUser) {
        throw new Error('Login response is missing user data');
      }
      writeSession({ token: data?.token || '', user: normalizedUser });
      return normalizedUser;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Cannot connect to server/DB (timeout)');
      }
      if (error?.message === 'Failed to fetch' || String(error?.message || '').includes('connect')) {
        throw new Error('Cannot connect to server/DB');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // Register via API (DB-backed)
  register: async (email: string, password: string, name: string): Promise<User> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchWithApiFallback('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      const normalizedUser = normalizeUser(data);
      if (!normalizedUser) {
        throw new Error('Registration response is missing user data');
      }
      writeSession({ token: data?.token || '', user: normalizedUser });
      return normalizedUser;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Cannot connect to server/DB (timeout)');
      }
      if (error?.message === 'Failed to fetch' || String(error?.message || '').includes('connect')) {
        throw new Error('Cannot connect to server/DB');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  logout: async () => {
    try {
        const { user } = readSession();
        if (user) {
            await fetchWithApiFallback('/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
        }
    } catch (e) {
        console.warn("Server logout failed, proceeding with local logout");
    } finally {
        localStorage.removeItem(SESSION_KEY);
    }
  },

  getCurrentUser: (): User | null => {
    return readSession().user;
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await fetchWithApiFallback('/users', {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return await response.json();
  },

  deleteUser: async (id: string): Promise<void> => {
    const response = await fetchWithApiFallback(`/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete user");
  },

  updateUserRole: async (id: string, role: string): Promise<void> => {
    const response = await fetchWithApiFallback(`/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error("Failed to update user");
  },

  updateUser: async (id: string, data: Partial<User>): Promise<void> => {
    const response = await fetchWithApiFallback(`/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Failed to update user details");
  },

  getAdminDbSummary: async (): Promise<AdminDbSummary> => {
    const response = await fetchWithApiFallback('/admin/db/summary', {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB summary');
    return await response.json();
  },

  getAdminDbUsers: async (query?: AdminDbQuery): Promise<AdminDbUserRow[]> => {
    const response = await fetchWithApiFallback(`/admin/db/users${toQueryString(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB users');
    return await response.json();
  },

  getAdminDbLoginSessions: async (query?: AdminDbQuery): Promise<AdminDbSessionRow[]> => {
    const response = await fetchWithApiFallback(`/admin/db/login-sessions${toQueryString(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB login sessions');
    return await response.json();
  },

  getAdminDbSensorData: async (query?: AdminDbQuery): Promise<AdminDbSensorRow[]> => {
    const response = await fetchWithApiFallback(`/admin/db/sensor-data${toQueryString(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB sensor data');
    return await response.json();
  },

  getAdminDbAuditLogs: async (query?: AdminDbQuery): Promise<AdminDbAuditRow[]> => {
    const response = await fetchWithApiFallback(`/admin/db/audit-logs${toQueryString(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB audit logs');
    return await response.json();
  },

  getAdminDbOtpCodes: async (): Promise<AdminDbOtpRow[]> => {
    const response = await fetchWithApiFallback('/admin/db/otp-codes', {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load DB otp codes');
    return await response.json();
  },

  getAdminDbUserDetails: async (id: string, query?: AdminDbQuery): Promise<AdminDbUserDetails> => {
    const response = await fetchWithApiFallback(`/admin/db/users/${id}/details${toQueryString(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load selected user details');
    return await response.json();
  },

  getMyDevices: async (): Promise<AdminDbDeviceRow[]> => {
    const response = await fetchWithApiFallback('/devices/my', {
      headers: getAuthHeaders()
    });
    if (!response.ok) await throwHttpError(response, 'Failed to load devices');
    return await response.json();
  },

  setPrimaryDevice: async (deviceId: string): Promise<{ success: boolean; device_id?: string }> => {
    const response = await fetchWithApiFallback('/devices/primary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ device_id: deviceId })
    });
    if (!response.ok) await throwHttpError(response, 'Failed to set primary device');
    return await response.json();
  },

  pairDevice: async (payload: { device_id: string; pairing_code: string; device_name?: string; location?: string; is_primary?: boolean; user_id?: string | number }): Promise<{ success: boolean; device_id?: string; is_primary?: boolean }> => {
    const response = await fetchWithApiFallback('/devices/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if (!response.ok) await throwHttpError(response, 'Failed to pair device');
    return await response.json();
  },

  updateDevice: async (payload: { device_id: string; device_name?: string; location?: string }): Promise<{ success: boolean; device_id?: string }> => {
    const response = await fetchWithApiFallback('/devices/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if (!response.ok) await throwHttpError(response, 'Failed to update device');
    return await response.json();
  },

  unpairDevice: async (deviceId: string): Promise<{ success: boolean; device_id?: string }> => {
    const response = await fetchWithApiFallback('/devices/unpair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ device_id: deviceId })
    });
    if (!response.ok) await throwHttpError(response, 'Failed to unpair device');
    return await response.json();
  },

  verifyPassword: async (email: string, password: string): Promise<boolean> => {
    try {
        const response = await fetchWithApiFallback('/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return data.verified === true;
    } catch {
        return false;
    }
  },

  // Social Login (Real & Mock)
  socialLogin: async (
    provider: string,
    payload: SocialLoginPayload = {},
  ): Promise<User> => {
     // Simulate API Delay for UI feedback
     await new Promise(resolve => setTimeout(resolve, 800));

     let mockPayload: any = {};
     const normalizedProvider = provider.toLowerCase();
     const realAccessToken = payload.accessToken;
     const realIdToken = payload.idToken;

     // Generate "Mock" Tokens that the Backend will accept and save to DB
     if (normalizedProvider.includes('google') || normalizedProvider.includes('workspace')) {
         if (realAccessToken || realIdToken) {
            mockPayload = {
              provider: 'google',
              accessToken: realAccessToken,
              idToken: realIdToken,
              email: payload.email,
              name: payload.name,
              avatar: payload.avatar,
            };
         } else {
            mockPayload = {
               provider: 'google',
               accessToken: 'mock_google_' + Math.random().toString(36).substr(2, 9),
               email: 'alex.smartfarm@gmail.com',
               name: 'Alex From Google',
               avatar: 'https://ui-avatars.com/api/?name=Alex+Google&background=DB4437&color=fff'
            };
         }
     } else if (normalizedProvider.includes('line')) {
        if (payload.authorizationCode || realAccessToken || realIdToken) {
          mockPayload = {
            provider: 'line',
            authorizationCode: payload.authorizationCode,
            redirectUri: payload.redirectUri,
            accessToken: realAccessToken,
            idToken: realIdToken,
            email: payload.email,
            name: payload.name,
          };
        } else {
          mockPayload = {
              provider: 'line',
              accessToken: 'mock_line_' + Math.random().toString(36).substr(2, 9),
              email: 'somchai.line@smartiot.com',
              name: 'Somchai (LINE)',
              avatar: 'https://ui-avatars.com/api/?name=Somchai+Line&background=06C755&color=fff'
          };
        }
     } else if (normalizedProvider.includes('facebook')) {
        if (realAccessToken || realIdToken) {
            // REAL FLOW: Use the token from Facebook SDK
            mockPayload = {
                provider: 'facebook',
                accessToken: realAccessToken,
                idToken: realIdToken,
                // Server fetches email/name using this token
            };
        } else {
            // MOCK FLOW (Fallback)
            mockPayload = {
                provider: 'facebook',
                accessToken: 'mock_fb_' + Math.random().toString(36).substr(2, 9),
                email: 'jane.facebook@smartiot.com',
                name: 'Jane Doe',
                avatar: 'https://ui-avatars.com/api/?name=Jane+FB&background=1877F2&color=fff'
            };
        }
     } else if (normalizedProvider.includes('microsoft') || normalizedProvider.includes('azure')) {
        if (payload.authorizationCode || realAccessToken || realIdToken) {
            mockPayload = {
                provider: 'microsoft',
                authorizationCode: payload.authorizationCode,
                redirectUri: payload.redirectUri,
                accessToken: realAccessToken,
                idToken: realIdToken,
                email: payload.email,
                name: payload.name,
                avatar: payload.avatar,
            };
        } else {
            mockPayload = {
                provider: 'microsoft',
                accessToken: 'mock_ms_' + Math.random().toString(36).substr(2, 9),
                email: 'sarah.engineer@outlook.com',
                name: 'Sarah Azure AD',
                avatar: 'https://ui-avatars.com/api/?name=Sarah+Azure&background=0078D4&color=fff'
            };
        }
     } else {
         // Default
         mockPayload = {
            provider: 'apple',
            accessToken: 'mock_azure_' + Math.random().toString(36).substr(2, 9), 
            email: 'sarah.engineer@outlook.com',
            name: 'Sarah Azure AD',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Azure&background=0078D4&color=fff'
         };
     }

     // ACTUALLY CALL THE BACKEND
     // This ensures the user is "Really" saved to the database users table.
     try {
         const response = await fetchWithApiFallback('/auth/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockPayload)
         });

         if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || 'Social login failed on server');
         }

         const data = await response.json();
         const normalizedUser = normalizeUser(data);
         
         if (!normalizedUser) throw new Error('Invalid user data from server');
         
         writeSession({ token: data.token, user: normalizedUser });
         return normalizedUser;
     } catch (error: any) {
         console.error("Social Auth Error:", error);
         throw error;
     }
  }
};
