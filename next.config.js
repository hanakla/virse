const withTM = require('next-transpile-modules')(['kalidokit']);

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    asyncWebAssembly: true,
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

module.exports = withTM(config);
