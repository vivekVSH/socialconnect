'use client';
import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted mb-6">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/feed" className="btn">
            Go to Feed
          </Link>
          <Link href="/" className="btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
