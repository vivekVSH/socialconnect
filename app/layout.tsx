'use client';
import "./globals.css";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/lib/useAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show loading screen only for auth-dependent parts
  if (loading && !user) {
    return (
      <html lang="en">
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-neutral-400 mt-2">Loading...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const showHeader = user || pathname !== '/';

  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <Navbar />
        <main className={showHeader ? "container mx-auto px-4 py-6" : ""}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}
