/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pg"],
  experimental: {
    // Document uploads go through a server action to RevProjects, which accepts up to
    // 25 MB. Both limits need headroom for the multipart envelope; the middleware one
    // applies because every portal page passes through the session-cookie check.
    serverActions: { bodySizeLimit: "26mb" },
    middlewareClientMaxBodySize: "26mb",
  },
}

export default nextConfig
