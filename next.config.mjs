/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // playwright-core is a Node runtime library — it must NOT be bundled by
    // webpack (it has native/optional deps like fsevents & chromium-bidi).
    serverComponentsExternalPackages: ["pino", "pino-pretty", "playwright-core"],
  },
};

export default nextConfig;
