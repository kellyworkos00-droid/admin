# Eterna Admin (Separate Repo)

A separate Next.js admin panel for managing products, orders, and users for the Eterna storefront.

## Stack

- Next.js 14 (App Router)
- Prisma ORM
- Neon PostgreSQL
- NextAuth (to add next)

## Run

1. Copy `.env.example` to `.env.local` and set Neon values.
2. Install packages:

`.env.local` example:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=replace-with-a-long-random-secret
ADMIN_API_TOKEN=replace-with-secure-token
```

```bash
npm install
```

3. Generate Prisma client and migrate:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Start app:

```bash
npm run dev
```

Default URL: `http://localhost:3000`

## API Contract For Storefront

Base URL (example): `https://admin-api.yourdomain.com/api/v1`

### Public endpoints

- `GET /api/v1/products`
- `GET /api/v1/products/:idOrSlug`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:orderNumber`

### Admin endpoints (protected)

- `POST /api/v1/admin/products`
- `PATCH /api/v1/admin/products/:id`
- `DELETE /api/v1/admin/products/:id` (soft delete)
- `GET /api/v1/admin/orders`
- `PATCH /api/v1/admin/orders/:id/status`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id/role`

All admin routes require header: `x-admin-token: <ADMIN_API_TOKEN>`.

## Notes

- Host this project separately from storefront (different Vercel project/domain).
- Recommended domain split:
  - Storefront: `www.yourdomain.com`
  - Admin: `admin.yourdomain.com`
  - API: `admin-api.yourdomain.com`
