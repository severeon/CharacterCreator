import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

const withMDX = createMDX({
  // options: remarkPlugins, rehypePlugins
});

export default withMDX(nextConfig);
