/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript that Next transpiles directly.
  transpilePackages: ['@pannico/shared'],
};

module.exports = nextConfig;
