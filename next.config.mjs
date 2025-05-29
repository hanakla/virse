import nextTranslate from 'next-translate-plugin';
import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const config = {
  experimental: {},
  transpilePackages: ['kalidokit', '@mediapipe/holistic'],
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextTranslate(withMDX(config));
