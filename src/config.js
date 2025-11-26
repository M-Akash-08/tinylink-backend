import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || "development",
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  dbUrl: "postgres://postgres:Akash%402195@localhost:5432/tinyLink",
  version: process.env.APP_VERSION || "1.0"
};

if (!config.dbUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
