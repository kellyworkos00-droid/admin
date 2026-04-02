'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Special handling for admin account
      if (email.toLowerCase() === 'eterna@admin.com' && password === 'zach1234') {
        // Create admin token directly
        const adminToken = Buffer.from(
          JSON.stringify({
            id: 'admin-system',
            email: 'eterna@admin.com',
            fullName: 'System Admin',
            role: 'ADMIN',
            sellerId: undefined,
          })
        ).toString('base64');

        localStorage.setItem('auth_token', adminToken);
        router.push('/admin');
        router.refresh();
        return;
      }

      // Try seller account login
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('auth_token', data.token);
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-red-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 p-3 shadow-lg">
            <Image src="/logo.png" alt="Eterna" fill sizes="64px" className="object-contain" priority />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mb-6 text-sm text-gray-600">Sign in to your Eterna admin account</p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 py-2.5 font-semibold text-white transition disabled:opacity-50 hover:shadow-lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <FiArrowRight />}
            </button>
          </form>

          {/* Signup link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-semibold text-rose-600 hover:text-rose-700">
                Create one as a seller
              </Link>
            </p>
          </div>

          {/* Demo info */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">Admin Demo Credentials:</p>
            <p>Email: <code className="font-mono bg-blue-100 px-1 rounded">eterna@admin.com</code></p>
            <p>Password: <code className="font-mono bg-blue-100 px-1 rounded">zach1234</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
