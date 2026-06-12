// Local development only — Vercel uses api/index.ts directly
import app from "./api/index.ts";

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`cvr.connect API on :${PORT}`));
