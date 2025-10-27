export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(
    /\/+$/,
    '',
  );
}

export async function fetchJSON<T>(
  pathOrUrl: string,
  options: RequestInit = {},
): Promise<T> {
  const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
  const url = isAbsolute ? pathOrUrl : `${apiBase()}${pathOrUrl}`;

  const token =
    typeof window !== 'undefined'
      ? (localStorage.getItem('authToken') ??
        localStorage.getItem('auth_token'))
      : null;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.message === 'string') message = data.message;
    } catch {}
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
