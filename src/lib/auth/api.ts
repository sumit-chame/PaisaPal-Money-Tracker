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
  try {
    const res = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: data.error || `Request failed with status ${res.status}`,
      };
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network connection error';
    return { ok: false, error: message };
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
