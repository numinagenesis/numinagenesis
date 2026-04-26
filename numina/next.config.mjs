/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Wagmi v3 bundles optional connector packages that aren't installed.
    // Alias them to false so webpack emits an empty module instead of erroring.
    const optionalConnectorPeers = [
      "porto/internal",
      "@base-org/account",
      "@coinbase/wallet-sdk",
      "@metamask/connect-evm",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider",
      "@walletconnect/ethereum-provider",
      "accounts",
    ];
    for (const pkg of optionalConnectorPeers) {
      config.resolve.alias[pkg] = false;
    }
    return config;
  },
};

export default nextConfig;
