import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load .env from parent directory
config({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
