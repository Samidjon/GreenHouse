import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode double-mounts effects in development, which keeps the Phaser
  // lifecycle in PhaserHost honest about never leaving a second game running.
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev badge would sit on top of the toolbar's hand button.
  devIndicators: false,
};

export default nextConfig;
