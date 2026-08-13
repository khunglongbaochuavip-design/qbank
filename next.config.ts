import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  serverExternalPackages: ['exceljs', 'bcryptjs', 'pg', '@prisma/adapter-pg'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
