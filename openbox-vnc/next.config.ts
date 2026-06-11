import type { NextConfig } from "next";

const nextConfig = {
    allowedDevOrigins: ["10.0.0.10", "temp.022025.xyz", "ob.022025.xyz"],
    transpilePackages: ["@novnc/novnc"],
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
