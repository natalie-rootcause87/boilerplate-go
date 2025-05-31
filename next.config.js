/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
  // Enable if you need to access env vars at build time
  serverRuntimeConfig: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
  // Enable if you need to access env vars at runtime
  publicRuntimeConfig: {
    // Add any public env vars here if needed
  },
}

module.exports = nextConfig 