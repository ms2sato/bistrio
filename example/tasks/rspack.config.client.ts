import path from "node:path";
import { fileURLToPath } from "node:url";
import { Configuration } from "@rspack/cli";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: Configuration = {
  entry: [path.join(__dirname, `.bistrio/routes/main/_entry.ts`)],
  resolve: {
    tsConfigPath: path.join(__dirname, "./config/client/tsconfig.client.development.json"),
    alias: {
      "@": path.join(__dirname),
      "@bistrio": path.join(__dirname, '.bistrio'),
      "@isomorphic": path.join(__dirname, 'isomorphic'),
      "@server": path.join(__dirname, 'server'),
    }
  }
}

export default config
