/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["capcut.mosuyang.org"],  // ← 加这一行
  async rewrites() {
    return [
      {
        // 凡是访问 /api/proxy/xxx 的请求，都由 Next.js 转发给 1111 端口后端
        source: '/api/proxy/:path*',
        destination: 'https://capcut.mosuyang.org/api/:path*',
      },
    ]
  },
  experimental: {
    serverActions: {
      // 如果你使用了 Server Actions 并且报错，也可以在这里配置
      allowedOrigins: ["192.168.71.29:3000", "localhost:2222"],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
}

export default nextConfig
