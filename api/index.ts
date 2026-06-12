import dotenv from "dotenv";
dotenv.config();

import app, { initDb } from "../server";

initDb().catch(console.error);

export default app;
