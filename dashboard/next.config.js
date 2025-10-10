/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    allowedDevOrigins: ['http://192.168.56.1:3000', 'http://localhost:3000'],
  },
};
const path = require("path");
let withBundleAnalyzer = (x) => x;
try {
  withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
} catch (_) { }
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
};
module.exports = withBundleAnalyzer(nextConfig);
