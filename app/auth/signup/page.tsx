'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/app/auth-context';
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiArrowRight, FiShoppingBag } from 'react-icons/fi';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    businessName: '',
    businessType: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const businessTypes = [
    'Wholesale Distributor',
    'Retailer',
    'Manufacturer',
    'Importer',
    'Agent/Reseller',
    'Other',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.fullName.trim()) {
        throw new Error('Full name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      if (formData.password !== formData.passwordConfirm) {
        throw new Error('Passwords do not match');
      }
      if (!formData.businessName.trim()) {
        throw new Error('Business name is required');
      }
      if (!formData.businessType) {
        throw new Error('Business type is required');
      }
      if (!formData.phone.trim()) {
        throw new Error('Phone number is required');
      }

      await signup(formData);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-red-50">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-rose-200 border-t-rose-600 h-12 w-12"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-red-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 p-3 shadow-lg">
            <Image src="/logo.png" alt="Eterna" fill sizes="64px" className="object-contain" priority />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Create Seller Account</h1>
          <p className="mb-6 text-sm text-gray-600">Start selling on Eterna marketplace</p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Info */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FiUser className="text-rose-600" /> Personal Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+254 712 345 678"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 transition hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    id="passwordConfirm"
                    type={showPassword ? 'text' : 'password'}
                    name="passwordConfirm"
                    required
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="pb-6 border-b">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FiShoppingBag className="text-rose-600" /> Business Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Business Name */}
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="ABC Wholesale Ltd"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Business Type */}
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type *
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    required
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Select business type</option>
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 py-2.5 font-semibold text-white transition disabled:opacity-50 hover:shadow-lg"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <FiArrowRight />}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-rose-600 hover:text-rose-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
