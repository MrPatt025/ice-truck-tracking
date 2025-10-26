'use client';
import { useEffect, useState } from 'react';

export default function PreferencesPanel() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'th'>('en');

  useEffect(() => {
    const s = localStorage.getItem('pref-lang') as 'en' | 'th' | null;
    if (s) setLang(s);
  }, []);

  const save = () => {
    localStorage.setItem('pref-lang', lang);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        data-testid="preferences-button"
        className="px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="preferences-panel"
      >
        Preferences
      </button>

      {open && (
        <div
          id="preferences-panel"
          data-testid="preferences-panel"
          className="absolute mt-2 w-64 rounded-xl border border-white/10 bg-black/40 backdrop-blur p-3"
          role="dialog"
          aria-label="User Preferences"
        >
          <div className="mb-2 text-sm opacity-80">Language</div>
          <div className="flex gap-2 mb-3">
            <button
              data-testid="language-en"
              className={`px-2 py-1 rounded border ${lang === 'en' ? 'border-white/60' : 'border-white/10'}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              data-testid="language-th"
              className={`px-2 py-1 rounded border ${lang === 'th' ? 'border-white/60' : 'border-white/10'}`}
              onClick={() => setLang('th')}
            >
              ไทย
            </button>
          </div>
          <button
            data-testid="save-preferences"
            onClick={save}
            className="px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
