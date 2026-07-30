/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript that Next transpiles directly.
  transpilePackages: ['@pannico/shared'],
  // Proxy browser API traffic to the backend so it never needs to be exposed
  // to the internet. `/api/orders` -> `${BACKEND_INTERNAL_URL}/orders`.
  // Server-side fetches bypass this and hit BACKEND_INTERNAL_URL directly
  // (see src/lib/api.ts).
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3000';
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
};

module.exports = nextConfig;
