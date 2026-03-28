import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@autointern/config",
    "@autointern/domain",
    "@autointern/llm",
    "@autointern/pdf",
    "@autointern/prompts",
    "@autointern/storage",
    "@autointern/tinyfish"
  ]
};

export default nextConfig;
