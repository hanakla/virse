const nextTranslate = require('next-translate-plugin');
const withTM = require('next-transpile-modules')(['kalidokit']);
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    asyncWebAssembly: true,
    newNextLinkBehavior: true,
  },
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

    // (config.experiments ??= {}).syncWebAssembly = true;

    return config;
  },
};

module.exports = nextTranslate(withMDX(withTM(config)));
