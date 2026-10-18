import type { NextConfig } from 'next';

// a static site: the planner runs entirely in the browser, so there is no server to keep alive or to leak data from
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
