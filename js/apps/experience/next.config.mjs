/** @type {import('next').NextConfig} */

// The experience app owns the browser-facing surfaces (member / admin / www) and
// proxies /api/* to the internal API service so the browser stays same-origin
// (no CORS; the API keeps no public hostname). Override the target for local dev
// with EXPERIENCE_API_ORIGIN=http://localhost:3000.
const API_ORIGIN = process.env.EXPERIENCE_API_ORIGIN || "http://api:3000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  }
};

export default nextConfig;
