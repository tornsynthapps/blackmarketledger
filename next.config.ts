import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
const repo = 'tradetracker';

const nextConfig: NextConfig = {
  basePath: isGithubActions ? `/${repo}` : "",
};

export default nextConfig;
