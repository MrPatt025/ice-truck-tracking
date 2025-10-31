'use client';

// Self‑service registration is not available. Provide a friendly notice.
export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white">
      <div className="w-full max-w-md rounded-md bg-[#0f1b2f] p-6 shadow-lg border border-slate-800/50">
        <h1 className="text-lg font-semibold mb-2">Request access</h1>
        <p className="text-[12px] text-slate-300 leading-relaxed">
          Self‑service account creation is disabled. To request access, please
          contact your administrator or project owner.
        </p>
        <div className="mt-4">
          <a
            className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-sm font-medium rounded px-3 py-2 transition-colors"
            href="/login"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
