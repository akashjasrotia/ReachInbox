"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Calendar, Send, Mail } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg mr-3 shadow-md">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
                ReachInbox
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-full py-1.5 px-2 shadow-sm transition-all hover:shadow-md">
                {session.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="h-8 w-8 rounded-full ring-2 ring-indigo-100 object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                    {session.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-sm pr-2">
                  <p className="font-semibold text-gray-900 leading-none">{session.user?.name}</p>
                  <p className="text-gray-500 text-[11px] mt-1 truncate max-w-[120px]">{session.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
