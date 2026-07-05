/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["sharp", "@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/admin/preview-certificate/**": ["public/certificate_template.png"],
    "/api/admin/mint/**": ["public/certificate_template.png"],
  },
};

export default nextConfig;
