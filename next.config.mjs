import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const config = {
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
  },
  experimental: {},
  transpilePackages: ['kalidokit', '@mediapipe/holistic'],
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default withMDX(config);
