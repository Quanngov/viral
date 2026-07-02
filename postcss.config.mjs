import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Limit Tailwind content scanning to app source — avoids Turbopack reading `.codegraph/daemon.sock`. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.join(projectRoot, "src"),
    },
  },
};

export default config;
