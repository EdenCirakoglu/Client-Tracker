/** @type {import('next').NextConfig} */
const standaloneOutput = process.env.NEXT_OUTPUT === 'standalone';

const nextConfig = {
  ...(standaloneOutput ? { output: 'standalone' } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
