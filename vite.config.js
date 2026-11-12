import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);

  return {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.SUPABASE_URL || ""),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY || ""),
    },
  };
});
