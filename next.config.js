/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/admin',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**'
            },
            {
                protocol: 'http',
                hostname: '**'
            },
        ],
    },
}

module.exports = nextConfig
