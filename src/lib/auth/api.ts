export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
  data?: T;
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let friendlyError = data.error || `Request failed with status ${res.status}`;
      if (friendlyError.includes('SSL alert') || friendlyError.includes('MongoServerSelectionError')) {
        friendlyError = 'Database connection issue. Please try again in a moment.';
      }
      return {
        ok: false,
        error: friendlyError,
      };
    }

    return data;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
      return { ok: false, error: 'Request timed out. Please check your network and try again.' };
    }
    const message = err instanceof Error ? err.message : 'Network connection error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authApi = {
  async getHealth() {
    return request<{ status: string; database: string }>('/api/health', {
      method: 'GET',
    });
  },

  async register(name: string, email: string, password: string): Promise<ApiResponse> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string): Promise<ApiResponse> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<ApiResponse> {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<ApiResponse> {
    return request('/api/auth/me', {
      method: 'GET',
    });
  },

  async updateName(name: string): Promise<ApiResponse> {
    return request('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount(password: string): Promise<ApiResponse> {
    return request('/api/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};
