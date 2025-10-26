'use client';

import type { JSX } from 'react';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

type Lang = 'en' | 'th';
const LS_KEY = 'pref-lang';

export default function PreferencesPanel(): JSX.Element {
  const uid = useId();
  const ids = {
    panel: `${uid}-preferences-panel`,
    title: `${uid}-preferences-title`,
    btnEn: `${uid}-language-en`,
    btnTh: `${uid}-language-th`,
  };

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  // Load initial preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fromLS = (() => {
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        return raw === 'th' || raw === 'en' ? (raw as Lang) : null;
      } catch {
        return null;
      }
    })();

    const prefersThai =
      typeof navigator !== 'undefined' &&
      Array.isArray(
        (navigator as unknown as { languages?: string[] }).languages,
      ) &&
      (navigator as unknown as { languages?: string[] }).languages?.some(
        (l) => typeof l === 'string' && l.toLowerCase().startsWith('th'),
      );

    const navTh =
      typeof navigator !== 'undefined' &&
      typeof navigator.language === 'string' &&
      navigator.language.toLowerCase().startsWith('th');

    const initial: Lang = fromLS ?? (prefersThai || navTh ? 'th' : 'en');
    setLang(initial);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', initial);
    }
  }, []);

  // Sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY) return;
      const v = e.newValue === 'th' ? 'th' : e.newValue === 'en' ? 'en' : null;
      if (!v) return;
      setLang(v);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', v);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const save = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LS_KEY, lang);
      } catch {
        // no-op
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
    close();
  }, [lang, close]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      const target = e.target as Node | null;
      if (!panel || !target) return;
      if (panel.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open, close]);

  // Esc to close + focus selected option when open + simple focus trap
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (el) =>
            !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'),
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !panelRef.current.contains(active)) {
            last?.focus();
            e.preventDefault();
          }
        } else {
          if (active === last || !panelRef.current.contains(active)) {
            first?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKey);

    const focusTargetId = lang === 'th' ? ids.btnTh : ids.btnEn;
    const el = document.getElementById(
      focusTargetId,
    ) as HTMLButtonElement | null;
    if (el) setTimeout(() => el.focus(), 0);

    return () => document.removeEventListener('keydown', handleKey);
  }, [open, lang, ids.btnEn, ids.btnTh, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        data-testid="preferences-button"
        className="px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={ids.panel}
        aria-haspopup="dialog"
        type="button"
      >
        Preferences
      </button>

      {open && (
        <div
          ref={panelRef}
          id={ids.panel}
          data-testid="preferences-panel"
          className="absolute mt-2 w-64 rounded-xl border border-white/10 bg-black/60 backdrop-blur p-3 shadow-xl z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ids.title}
        >
          <div id={ids.title} className="mb-2 text-sm opacity-80">
            Language
          </div>

          <div className="flex gap-2 mb-3">
            <button
              id={ids.btnEn}
              data-testid="language-en"
              className={`px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-white/30 ${
                lang === 'en' ? 'border-white/60' : 'border-white/10'
              }`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              type="button"
            >
              English
            </button>

            <button
              id={ids.btnTh}
              data-testid="language-th"
              className={`px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-white/30 ${
                lang === 'th' ? 'border-white/60' : 'border-white/10'
              }`}
              onClick={() => setLang('th')}
              aria-pressed={lang === 'th'}
              type="button"
            >
              ไทย
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={close}
              className="px-3 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              type="button"
            >
              Cancel
            </button>
            <button
              data-testid="save-preferences"
              onClick={save}
              className="px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
