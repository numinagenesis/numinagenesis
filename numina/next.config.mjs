/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Wagmi v2 + RainbowKit v2: stub optional connector packages that are not
    // installed so webpack emits an empty module instead of erroring.
    // @walletconnect/ethereum-provider is intentionally NOT stubbed — it is a
    // real installed dependency required by RainbowKit's WalletConnect connector.
    const optionalConnectorPeers = [
      "porto/internal",
      "@base-org/account",
      "@coinbase/wallet-sdk",
      "@metamask/connect-evm",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider",
      "accounts",
    ];
    for (const pkg of optionalConnectorPeers) {
      config.resolve.alias[pkg] = false;
    }
    return config;
  },
};

export default nextConfig;
