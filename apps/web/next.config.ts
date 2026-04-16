import type { NextConfig } from "next";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the monorepo root so all apps share one file
config({ path: resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

