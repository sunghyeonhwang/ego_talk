import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

export default pool;
