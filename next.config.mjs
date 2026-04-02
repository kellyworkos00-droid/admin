/** @type {import('next').NextConfig} */
const nextConfig = {
	compress: true,
	images: {
		formats: ["image/avif", "image/webp"],
		minimumCacheTTL: 86400,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "**", // allow seller-uploaded images from any host
			},
		],
	},
};

export default nextConfig;
