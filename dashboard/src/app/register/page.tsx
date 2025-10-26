'use client';

// Minimal placeholder to avoid lint noise; registration can be initiated from other UI flows.
export default function RegisterPage() {
  // Redirect away if mounted
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
  return null;
}
