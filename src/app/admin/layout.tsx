'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminProfile, signOutAdmin, AdminProfile } from '@/lib/auth';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  ClipboardList,
  Users,
  Percent,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';

const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, current: true },
  { name: 'Products', href: '/admin/products', icon: ShoppingBag, current: false },
  { name: 'Inventory', href: '/admin/inventory', icon: Boxes, current: false },
  { name: 'Orders', href: '/admin/orders', icon: ClipboardList, current: false },
  { name: 'Customers', href: '/admin/customers', icon: Users, current: false },
  { name: 'Discounts', href: '/admin/discounts', icon: Percent, current: false },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, current: false },
  { name: 'Content', href: '/admin/content', icon: FileText, current: false },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/admin/login';

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // If on /admin/login, bypass the auth guard check
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkAuth() {
      try {
        const admin = await getAdminProfile();
        if (!isMounted) return;

        if (!admin) {
          // Unauthenticated or non-admin user -> redirect to login
          router.replace('/admin/login');
          return;
        }

        setProfile(admin);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          router.replace('/admin/login');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    await signOutAdmin();
    setProfile(null);
    router.replace('/admin/login');
  };

  // If on login page, render child page without admin sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading / Auth Verification State
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-soft-gold animate-spin mx-auto" />
          <p className="font-tech text-xs uppercase tracking-[0.3em] text-ivory/70">
            Verifying Atelier Security Clearance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1012] text-ivory flex">
      {/* 1. Desktop Admin Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-[#14171A] border-r border-white/10 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-soft-gold to-[#B8860B] flex items-center justify-center text-charcoal font-bold font-serif text-xl shadow-luxury">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-lg tracking-tight text-white">
                  VELORA
                </span>
                <span className="font-tech text-[9px] uppercase tracking-wider bg-soft-gold/20 text-soft-gold px-1.5 py-0.5 rounded font-bold">
                  Atelier
                </span>
              </div>
              <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-ivory/50">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-soft-gold text-charcoal shadow-luxury'
                    : 'text-ivory/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-charcoal' : 'text-ivory/60'}`} />
                <span>{item.name}</span>
                {item.name === 'Dashboard' && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-charcoal" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Current Admin Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-soft-gold" />
              <span className="font-tech text-[10px] uppercase tracking-wider text-soft-gold font-bold">
                {profile.role === 'super_admin' ? 'Super Admin' : 'Staff Admin'}
              </span>
            </div>
            <p className="font-sans text-xs text-white truncate font-medium">
              {profile.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/70 hover:text-white text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>

            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 bg-[#14171A] p-6 flex flex-col z-10 border-r border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <span className="font-serif font-bold text-lg text-white">VELORA Admin</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-ivory/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold ${
                      isActive ? 'bg-soft-gold text-charcoal' : 'text-ivory/70 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
              <div className="text-xs text-ivory/70 truncate">{profile.email}</div>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#14171A] border-b border-white/10 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-ivory/70 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold text-white">Atelier Dashboard</span>
              <span className="hidden sm:inline text-xs font-tech uppercase text-ivory/40">/ Overview</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Live Atelier
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-soft-gold text-charcoal font-serif font-bold text-sm flex items-center justify-center shadow-sm">
                {profile.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="font-sans text-xs text-white font-medium truncate max-w-[140px]">
                  {profile.email}
                </p>
                <p className="font-tech text-[9px] uppercase tracking-wider text-soft-gold font-semibold">
                  {profile.role === 'super_admin' ? 'Super Admin' : 'Staff'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-ivory/60 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Admin Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#0E1012]">
          {children}
        </main>
      </div>
    </div>
  );
}
