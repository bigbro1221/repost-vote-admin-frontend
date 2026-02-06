/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    basePath: '/admin',
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
