const API_BASE_URL = 'http://localhost:5000/api/v1';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }

  async validateToken(token: string): Promise<LoginResponse['user']> {
    const response = await fetch(`${API_BASE_URL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token validation failed');
    }

    const data = await response.json();
    return data.user;
  }

  async refreshToken(token: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }
}

export const authService = new AuthService();