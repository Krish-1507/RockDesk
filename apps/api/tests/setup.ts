import path from "node:path";
import dotenv from "dotenv";

// Load the repo-root .env so tests share the same secrets as the API.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
