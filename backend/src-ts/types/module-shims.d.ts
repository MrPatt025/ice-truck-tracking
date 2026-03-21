declare module 'bcryptjs' {
  export function hash(input: string, rounds: number): Promise<string>;
  export function compare(input: string, encrypted: string): Promise<boolean>;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    issuer?: string;
    audience?: string;
  }

  export interface JwtPayload {
    sub?: string | number;
    [key: string]: unknown;
  }

  export function sign(
    payload: Record<string, unknown>,
    secret: string,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secret: string,
    options?: VerifyOptions
  ): string | JwtPayload;

  const jwtDefault: {
    sign: typeof sign;
    verify: typeof verify;
  };

  export default jwtDefault;
}
