/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ],
    }, {
      source: '/:path((?!_next/static/).*)',
      headers: [{key:'Cache-Control',value:'private, no-store'}],
    }];
  },
};

export default config;
