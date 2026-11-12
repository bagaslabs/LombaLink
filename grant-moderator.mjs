import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.");
}

const admin = createClient(supabaseUrl, secretKey);

const { data, error } = await admin.auth.admin.updateUserById(
  "ab8c1757-cb71-4636-93bd-b0cd37b422eb",
  { app_metadata: { role: "moderator" } },
);

if (error) throw error;
console.log(data.user.app_metadata);