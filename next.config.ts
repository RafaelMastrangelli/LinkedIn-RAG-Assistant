import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['sqlite3', 'sqlite', 'playwright', 'pdf-parse'],
};

export default nextConfig;
