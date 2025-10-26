// src/types/ui.ts
export type UIAlert = {
  id: string | number;
  level: 'INFO' | 'WARN' | 'ERROR' | string;
  message: string;
  ts: string | number | Date;
};
