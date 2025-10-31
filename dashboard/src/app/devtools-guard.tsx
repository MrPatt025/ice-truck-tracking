'use client';

import { useEffect } from 'react';

/**
 * Optional guard to neutralize React DevTools when an incompatible extension
 * causes runtime errors (e.g., semver parsing failure with React 19).
 *
 * Enable by setting NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS=1 in your env.
 */

function neutralizeHook() {
  try {
    const w = window as unknown as { [k: string]: unknown } & {
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown> & {
        renderers?: Map<unknown, unknown>;
      };
    };
    const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook) return;

    // Clear renderers map
    try {
      if (hook.renderers instanceof Map) {
        hook.renderers = new Map();
      }
    } catch {}

    // Neutralize all hook properties
    for (const key of Object.keys(hook)) {
      try {
        const val = (hook as Record<string, unknown>)[key];
        (hook as Record<string, unknown>)[key] =
          typeof val === 'function' ? () => undefined : null;
      } catch {}
    }
  } catch {
    // ignore
  }
}

export default function DevtoolsGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS === '1') {
      neutralizeHook();
    }
  }, []);

  return null;
}
