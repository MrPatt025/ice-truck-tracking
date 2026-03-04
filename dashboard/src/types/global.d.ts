declare module '*.css'

// Google Analytics gtag.js
interface GtagEventParams {
  [key: string]: string | number | boolean | undefined;
}

declare function gtag(command: 'config', targetId: string, config?: GtagEventParams): void;
declare function gtag(command: 'event', action: string, params?: GtagEventParams): void;
declare function gtag(command: 'consent', action: 'update', params: GtagEventParams): void;
declare function gtag(command: string, ...args: unknown[]): void;

interface Window {
  gtag?: typeof gtag;
}
