import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Trace only the files the server actually needs into .next/standalone, so the
  // deploy image ships a minimal runtime instead of the whole node_modules —
  // much smaller/faster container builds.
  output: "standalone",
  // React Compiler (stable in Next 16) auto-memoizes components at build time,
  // removing the need for most manual useMemo/useCallback/React.memo. Next
  // pre-filters with SWC so only JSX/hook files run through the Babel plugin.
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
