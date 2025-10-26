'use client';

import { useEffect, useState, memo, type ReactNode } from 'react';
import type { JSX } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

function ClientOnly({ children, fallback = null }: Props): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : <>{fallback}</>;
}

export default memo(ClientOnly);
