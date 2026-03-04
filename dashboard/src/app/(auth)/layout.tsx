import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Ice Truck Tracking',
  description: 'Sign in to your Ice Truck Tracking account to monitor your fleet in real-time.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
