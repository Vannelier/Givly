/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // `pg` charge des modules Node natifs : le bundler doit le laisser tranquille.
  serverExternalPackages: ["pg", "sharp"],
};

export default nextConfig;
