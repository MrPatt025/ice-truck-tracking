import type { JSX } from 'react';

export default function NotFound(): JSX.Element {
  return (
    <div className="p-8 text-center space-y-2">
      <h1 className="text-2xl font-semibold">404 — Not Found</h1>
      <p className="text-slate-500">
        The page you are looking for does not exist.
      </p>
      <a href="/" className="underline">
        Go home
      </a>
    </div>
  );
}
