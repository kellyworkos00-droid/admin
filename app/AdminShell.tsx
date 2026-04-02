"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FiGrid,
  FiPackage,
  FiShoppingBag,
  FiImage,
  FiTrendingUp,
  FiUsers,
  FiTag,
  FiFileText,
  FiClipboard,
  FiMenu,
  FiX,
  FiAlertTriangle,
  FiShoppingCart,
  FiLogOut,
} from "react-icons/fi";

const allNavItems = [
  { label: "Dashboard", href: "/admin", icon: FiGrid },
  { label: "Products", href: "/admin/products", icon: FiPackage },
  { label: "Orders", href: "/admin/orders", icon: FiShoppingBag },
  { label: "Slider", href: "/admin/slider", icon: FiImage, adminOnly: true, mainAdminOnly: true },
  { label: "Analytics", href: "/admin/analytics", icon: FiTrendingUp },
  { label: "Customers", href: "/admin/customers", icon: FiUsers },
  { label: "Promos", href: "/admin/promos", icon: FiTag },
  { label: "Sellers", href: "/admin/sellers", icon: FiUsers, adminOnly: true, mainAdminOnly: true },
  { label: "Content", href: "/admin/content", icon: FiFileText, adminOnly: true, mainAdminOnly: true },
  { label: "Audit Logs", href: "/admin/audit", icon: FiClipboard, adminOnly: true, mainAdminOnly: true },
];

const sellerNavItems = [
  { label: "Dashboard", href: "/seller", icon: FiGrid },
  { label: "My Products", href: "/seller/products", icon: FiPackage },
  { label: "My Orders", href: "/seller/orders", icon: FiShoppingBag },
];

type Props = {
  children: React.ReactNode;
  lowStockCount: number;
  newOrdersCount: number;
};

export default function AdminShell({ children, lowStockCount, newOrdersCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user info from token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        setUserRole(decoded.role);
        setUserEmail(decoded.email);
        setIsMainAdmin(decoded.isMainAdmin === true);
      } catch (e) {
        console.error('Failed to parse token');
      }
    }
    setIsLoading(false);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Filter nav items based on role
  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly && userRole !== "ADMIN") {
      return false;
    }
    if (item.mainAdminOnly && !isMainAdmin) {
      return false;
    }
    return true;
  });
  const visibleNavItems = userRole === "CUSTOMER" ? sellerNavItems : navItems;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      router.push('/auth/login');
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-700 to-red-600 p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-white/95 p-1 shadow-sm">
              <Image src="/logo.png" alt="Eterna" fill sizes="36px" className="object-contain" priority />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-100">Eterna</p>
              <p className="text-base font-bold leading-tight">Admin Panel</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-1.5 text-white/80 transition hover:bg-white/20 lg:hidden"
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>
        <p className="mt-2 text-xs text-rose-100 opacity-80">Operations workspace</p>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || newOrdersCount > 0) && (
        <div className="mt-4 space-y-2">
          {newOrdersCount > 0 && (
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              <FiShoppingCart size={13} />
              <span>{newOrdersCount} new order{newOrdersCount !== 1 ? "s" : ""} pending</span>
            </Link>
          )}
          {lowStockCount > 0 && (
            <Link
              href="/admin/products"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <FiAlertTriangle size={13} />
              <span>{lowStockCount} low stock item{lowStockCount !== 1 ? "s" : ""}</span>
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive(href)
                ? "bg-rose-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            <Icon size={17} className={isActive(href) ? "text-white" : "text-gray-400"} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        {userEmail && (
          <div className="mb-3 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-700">Logged in as</p>
            <p className="text-xs text-gray-600 truncate">{userEmail}</p>
            <p className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
              {isMainAdmin ? '👑 Main Admin' : userRole === 'ADMIN' ? '🛡️ Admin' : '🏪 Seller'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <FiLogOut size={16} />
          Logout
        </button>
      </div>

      {/* Footer hint */}
      <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-rose-700">
        Keep inventory accurate and update order statuses in real time.
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-gray-300 border-t-rose-600 h-12 w-12"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-gray-200/80 bg-white/90 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto border-r border-gray-200 bg-white px-4 py-5 shadow-2xl transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 lg:hidden"
              aria-label="Open menu"
            >
              <FiMenu size={18} />
            </button>

            {/* Title */}
            <p className="flex-1 truncate text-sm font-bold text-gray-800 lg:text-base">
              Eterna <span className="text-rose-600">Operations</span>
            </p>

            {/* Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {lowStockCount > 0 && (
                <Link
                  href="/admin/products"
                  className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
                >
                  <FiAlertTriangle size={11} />
                  <span className="hidden sm:inline">Stock </span>{lowStockCount}
                </Link>
              )}
              {newOrdersCount > 0 && (
                <Link
                  href="/admin/orders"
                  className="flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 transition hover:bg-sky-200"
                >
                  <FiShoppingCart size={11} />
                  <span className="hidden sm:inline">Orders </span>{newOrdersCount}
                </Link>
              )}
              <div className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                {isMainAdmin ? '👑 Main Admin' : userRole === 'ADMIN' ? '🛡️ Admin' : '🏪 Seller'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
