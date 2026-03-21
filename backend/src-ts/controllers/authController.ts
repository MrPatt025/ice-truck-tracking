import type { LoginResponse } from '../services/authService';

interface HttpRequest {
  body: unknown;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(payload: unknown): void;
}

type NextFunction = (error?: unknown) => void;

interface AuthServiceContract {
  login(identifier: string, password: string): Promise<LoginResponse>;
}

interface LoginBody {
  username?: string;
  email?: string;
  password?: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    (body.username === undefined || typeof body.username === 'string') &&
    (body.email === undefined || typeof body.email === 'string') &&
    (body.password === undefined || typeof body.password === 'string')
  );
}

function normalizeIdentifier(body: LoginBody): string | null {
  if (typeof body.username === 'string' && body.username.trim().length > 0) {
    return body.username.trim();
  }

  if (typeof body.email === 'string' && body.email.trim().length > 0) {
    return body.email.trim();
  }

  return null;
}

export class AuthControllerTs {
  constructor(private readonly authService: AuthServiceContract) {}

  async login(req: HttpRequest, res: HttpResponse, next: NextFunction): Promise<void> {
    try {
      if (!isLoginBody(req.body)) {
        next(Object.assign(new Error('Invalid request body'), { statusCode: 400 }));
        return;
      }

      const identifier = normalizeIdentifier(req.body);
      const password = req.body.password;

      if (!identifier || !password || password.trim().length === 0) {
        next(Object.assign(new Error('Please provide username/email and password'), { statusCode: 400 }));
        return;
      }

      const payload = await this.authService.login(identifier, password);
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  }
}
