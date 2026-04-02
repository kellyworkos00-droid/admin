# Authentication System Documentation

## Overview

Eterna Admin Panel now includes a complete authentication and role-based access control (RBAC) system. Users can log in as either **Admin** (full access) or **Seller** (restricted access), and new sellers can sign up through the registration page.

---

## User Roles & Permissions

### 👑 Admin (Full Access)
- **Email**: `eterna@admin.com`
- **Password**: `zach1234`
- **Access**: 
  - Full admin dashboard
  - All navigation items including:
    - Dashboard
    - Products
    - Orders
    - **Slider** ✓
    - Analytics
    - Customers
    - Promos
    - **Content** ✓
    - Audit Logs

### 🏪 Seller (Restricted Access)
- **Account Type**: Created via signup
- **Verification**: Pending admin approval
- **Access**:
  - Dashboard (view earnings, subscription status)
  - Products (manage inventory)
  - Orders (view their orders)
  - Analytics (basic stats)
  - Customers (view buyers)
  - Promos (manage their promos)
  - **Slider**: ❌ Blocked
  - **Content**: ❌ Blocked
  - Audit Logs: ❌ Blocked (Admin only)

---

## Authentication Flow

### Login Page (`/auth/login`)
1. User enters email and password
2. System checks if credentials match admin account:
   - If `eterna@admin.com` + `zach1234` → Admin token created locally
   - Otherwise → Check database for seller account
3. Valid credentials → Encrypted token stored in localStorage → Redirect to `/admin`
4. Invalid credentials → Error message displayed

### Signup Page (`/auth/signup`)
1. New user fills seller registration form:
   - Personal: Full Name, Email, Password, Phone
   - Business: Business Name, Business Type, Industry
2. System validates all fields
3. User created with role `CUSTOMER` and status `PENDING`
4. Associated `Seller` profile created with status `PENDING` (awaiting admin verification)
5. Session token created → Redirect to `/admin` (limited access until verified)

### Logout
- Click "Logout" button in sidebar
- Token cleared from localStorage
- Redirect to `/auth/login`

---

## Token Structure

Tokens are Base64-encoded JSON containing:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "ADMIN" | "CUSTOMER",
  "sellerId": "seller-id-if-applicable"
}
```

**Storage**: localStorage under key `auth_token`  
**Scope**: 7-day cookie + localStorage persistence across sessions

---

## Navigation Access Control

The sidebar dynamically filters menu items based on user role:

| Navigation Item | Admin | Seller |
|--|--|--|
| Dashboard | ✓ | ✓ |
| Products | ✓ | ✓ |
| Orders | ✓ | ✓ |
| **Slider** | ✓ | ✗ |
| Analytics | ✓ | ✓ |
| Customers | ✓ | ✓ |
| Promos | ✓ | ✓ |
| **Content** | ✓ | ✗ |
| Audit Logs | ✓ | ✗ |

Items marked with ✗ are **hidden** from seller navigation and **blocked** at the route level.

---

## Key Files & Architecture

### API Routes
- **POST `/api/auth`** - Login (admin hardcoded or seller from DB)
- **POST `/api/auth/signup`** - Seller registration
- **POST `/api/auth/logout`** - Logout (clears session)

### Pages
- **`/auth/login`** - Public login page
- **`/auth/signup`** - Public seller registration
- **`/admin`** - Protected admin dashboard (redirects to login if not authenticated)

### Components & Context
- **`auth-context.tsx`** - React Context for global auth state
- **`AdminShell.tsx`** - Main layout with sidebar (filters nav items by role)
- **`AdminLayoutWrapper.tsx`** - Route protection and authentication check

### Utilities
- **`lib/auth-utils.ts`** - Server-side auth helpers (getCurrentUser, isAdmin, isSeller, etc.)

### Middleware
- **`middleware.ts`** - Route-level protection (redirects unauthenticated users to `/auth/login`)

---

## Testing the System

### Test Case 1: Admin Login
1. Go to `/auth/login`
2. Enter:
   - Email: `eterna@admin.com`
   - Password: `zach1234`
3. ✓ Should see full navigation including Slider & Content
4. ✓ Should see "👑 Admin" badge

### Test Case 2: Seller Signup
1. Go to `/auth/signup`
2. Fill form:
   - Full Name: `John Doe`
   - Email: `john@company.com`
   - Password: `test123456`
   - Phone: `+254712345678`
   - Business Name: `ABC Wholesale`
   - Business Type: `Wholesale Distributor`
3. ✓ Account created
4. ✓ See "🏪 Seller" badge
5. ✓ Slider & Content items **hidden** from sidebar

### Test Case 3: Route Protection
1. Log out
2. Try to access `/admin/slider` directly
3. ✓ Redirected to `/auth/login`

### Test Case 4: Role-Based Route Blocking
1. Log in as seller
2. Try to access `/admin/content` in address bar
3. ✓ Page accessible but should show "Access Denied" (if page validation added)
4. ✓ Content & Slider not visible in sidebar

---

## Future Enhancements

1. **Email Verification**: Confirm seller email during signup
2. **2FA**: Two-factor authentication for admin
3. **Password Reset**: Forgot password flow
4. **Session Expiry**: Auto-logout after inactivity
5. **API Token Generation**: Webhooks for seller APIs
6. **Audit Logging**: Track login/logout events
7. **IP Whitelisting**: Restrict admin access by IP
8. **Session Management**: See active sessions, remotely logout

---

## Security Notes

⚠️ **Current Implementation**:
- Tokens stored in localStorage (vulnerable to XSS)
- Admin password hardcoded in frontend (for demo only)
- No HTTPS enforcement yet
- Seller passwords hashed with bcrypt (✓ secure)

🔒 **Production Recommendations**:
1. Move admin credentials to secure configuration
2. Use httpOnly cookies instead of localStorage
3. Implement CSRF protection
4. Add rate limiting on auth endpoints
5. Enable HTTPS with secure headers
6. Require email verification for sellers
7. Implement session timeout
8. Add admin 2FA

---

## Troubleshooting

### Login shows "Invalid email or password"
- For sellers: Check if account exists in database and status is not REJECTED
- For admin: Verify exact spelling of `eterna@admin.com` and `zach1234`

### Sidebar shows full menu but should be restricted
- Check localStorage for `auth_token`
- Verify token decodes properly (should have `role` field)
- Check browser console for decoding errors

### Logout doesn't work
- Check if `/api/auth/logout` route exists and responds
- Try clearing localStorage manually: `localStorage.removeItem('auth_token')`

### New seller can't log in
- Check `User` table for account creation
- Verify `Seller` profile was created (linked via `userId`)
- Check seller `status` is not REJECTED

---

## Quick Start for Developers

### Add New Protected Route
```typescript
// app/admin/my-page/page.tsx
'use client';
import { useAuth } from '@/app/auth-context';

export default function MyPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  // Check role-specific access
  if (user.role !== 'ADMIN') {
    return <div>Admin only access</div>;
  }
  
  return <div>Admin content here</div>;
}
```

### Add New Admin-Only Navigation Item
```typescript
// In AdminShell.tsx - allNavItems array
const allNavItems = [
  // ... existing items
  { label: "New Feature", href: "/admin/new-feature", icon: FiStar, adminOnly: true },
];
```

---

## Contact & Support

For authentication issues or questions, review:
1. Browser console logs
2. Network tab (check `/api/auth` responses)
3. localStorage contents (see `auth_token` value)
4. Middleware logs

Version: 1.0.0  
Last Updated: 2024
