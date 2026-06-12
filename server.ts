import express from "express";
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import pg from "pg";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(clerkMiddleware({
  clockSkewInMs: 60_000,
}));

// ─── Database ─────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending',
      id_card    TEXT,
      is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      age        INT NOT NULL,
      gender     TEXT NOT NULL,
      department TEXT NOT NULL,
      year       INT NOT NULL DEFAULT 1,
      photos     TEXT[] NOT NULL DEFAULT '{}',
      prompts    JSONB NOT NULL DEFAULT '[]',
      bio        TEXT NOT NULL DEFAULT '',
      interests  TEXT[] NOT NULL DEFAULT '{}',
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS likes (
      id          TEXT PRIMARY KEY,
      sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id     TEXT,
      item_type   TEXT,
      message     TEXT,
      is_read     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (sender_id, receiver_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id         TEXT PRIMARY KEY,
      user1_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      match_id   TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT NOT NULL DEFAULT '',
      image_url  TEXT,
      is_read    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reports (
      id               TEXT PRIMARY KEY,
      reporter_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason           TEXT NOT NULL,
      details          TEXT,
      status           TEXT NOT NULL DEFAULT 'pending',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("[db] ready");
}

function uid() {
  return crypto.randomUUID();
}

function userId(req: express.Request): string {
  return getAuth(req).userId!;
}

// ─── Profile sync ─────────────────────────────────────────────────────────────

app.post("/api/sync", requireAuth(), async (req, res) => {
  const id = userId(req);
  const { email, name, idCard, age, gender, department, year, photos, prompts, bio, interests } = req.body;

  if (!email?.endsWith("@cvr.ac.in")) {
    return res.status(403).json({ error: "Only @cvr.ac.in accounts are allowed." });
  }

  await pool.query(
    `INSERT INTO users (id, email, name, id_card)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [id, email, name, idCard || null]
  );

  await pool.query(
    `INSERT INTO profiles (user_id, age, gender, department, year, photos, prompts, bio, interests)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     ON CONFLICT (user_id) DO NOTHING`,
    [id, age || 20, gender || "Other", department || "Computer Science (CSE)",
     year || 1, photos || [], JSON.stringify(prompts || []), bio || "", interests || []]
  );

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.status, u.is_admin,
            p.age, p.gender, p.department, p.year,
            p.photos, p.prompts, p.bio, p.interests, p.last_active
     FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [id]
  );

  res.json(rows[0]);
});

// ─── Me ───────────────────────────────────────────────────────────────────────

app.get("/api/me", requireAuth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.status, u.is_admin,
            p.age, p.gender, p.department, p.year,
            p.photos, p.prompts, p.bio, p.interests, p.last_active
     FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId(req)]
  );
  if (!rows[0]) return res.status(404).json({ error: "Profile not found." });
  res.json(rows[0]);
});

app.patch("/api/me", requireAuth(), async (req, res) => {
  const id = userId(req);
  const { name, age, gender, department, year, photos, prompts, bio, interests } = req.body;

  await pool.query(
    `UPDATE profiles SET
       age        = COALESCE($2::int,    age),
       gender     = COALESCE($3,         gender),
       department = COALESCE($4,         department),
       year       = COALESCE($5::int,    year),
       photos     = COALESCE($6,         photos),
       prompts    = COALESCE($7::jsonb,  prompts),
       bio        = COALESCE($8,         bio),
       interests  = COALESCE($9,         interests),
       last_active = NOW()
     WHERE user_id = $1`,
    [id, age ?? null, gender ?? null, department ?? null, year ?? null,
     photos ?? null, prompts ? JSON.stringify(prompts) : null, bio ?? null, interests ?? null]
  );

  if (name) await pool.query("UPDATE users SET name = $2 WHERE id = $1", [id, name]);

  res.json({ ok: true });
});

app.delete("/api/me", requireAuth(), async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId(req)]);
  res.json({ ok: true });
});

// ─── Feed ─────────────────────────────────────────────────────────────────────

app.get("/api/feed", requireAuth(), async (req, res) => {
  const id = userId(req);
  const { year, dept, minAge, maxAge } = req.query;

  const { rows: me } = await pool.query(
    `SELECT u.status, p.gender FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [id]
  );
  if (!me[0]) return res.status(404).json({ error: "Profile not found." });
  if (me[0].status !== "approved") return res.json({ profiles: [] });

  const opposite = me[0].gender === "Male" ? "Female" : "Male";

  const { rows } = await pool.query(
    `SELECT p.user_id, p.age, p.gender, p.department, p.year,
            p.photos, p.prompts, p.bio, p.interests, p.last_active, u.name
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE u.id != $1
       AND u.status = 'approved'
       AND p.gender = $2
       AND u.id NOT IN (SELECT receiver_id FROM likes WHERE sender_id = $1)
       AND u.id NOT IN (
         SELECT CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END
         FROM matches WHERE user1_id = $1 OR user2_id = $1
       )
       AND ($3::int  IS NULL OR p.year = $3)
       AND ($4::text IS NULL OR p.department = $4)
       AND ($5::int  IS NULL OR p.age >= $5)
       AND ($6::int  IS NULL OR p.age <= $6)
     ORDER BY p.last_active DESC`,
    [id, opposite,
     year ? Number(year) : null,
     (dept && dept !== "All") ? String(dept) : null,
     minAge ? Number(minAge) : null,
     maxAge ? Number(maxAge) : null]
  );

  res.json({ profiles: rows });
});

// ─── Likes ────────────────────────────────────────────────────────────────────

app.post("/api/likes", requireAuth(), async (req, res) => {
  const sender = userId(req);
  const { receiverId, itemId, itemType, message } = req.body;

  const { rows: count } = await pool.query(
    `SELECT COUNT(*) FROM likes WHERE sender_id = $1 AND created_at > NOW() - INTERVAL '1 day'`,
    [sender]
  );
  if (Number(count[0].count) >= 8) {
    return res.status(429).json({ error: "Daily like limit reached (8/day). Try again tomorrow." });
  }

  await pool.query(
    `INSERT INTO likes (id, sender_id, receiver_id, item_id, item_type, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
    [uid(), sender, receiverId, itemId || null, itemType || null, message || null]
  );

  const { rows: mutual } = await pool.query(
    `SELECT id FROM likes WHERE sender_id = $1 AND receiver_id = $2`,
    [receiverId, sender]
  );

  if (mutual[0]) {
    const matchId = uid();
    await pool.query(
      `INSERT INTO matches (id, user1_id, user2_id) VALUES ($1, $2, $3)`,
      [matchId, sender, receiverId]
    );
    await pool.query(
      `DELETE FROM likes WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [sender, receiverId]
    );
    return res.json({ isMatch: true, matchId });
  }

  res.json({ isMatch: false });
});

app.get("/api/likes/received", requireAuth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.item_id, l.item_type, l.message, l.created_at,
            p.user_id, p.age, p.gender, p.department, p.year, p.photos, p.prompts, u.name
     FROM likes l
     JOIN users u ON u.id = l.sender_id
     JOIN profiles p ON p.user_id = u.id
     WHERE l.receiver_id = $1 AND u.status = 'approved'
     ORDER BY l.created_at DESC`,
    [userId(req)]
  );
  res.json({ likes: rows });
});

app.post("/api/likes/:id/resolve", requireAuth(), async (req, res) => {
  const receiver = userId(req);
  const { action } = req.body;

  const { rows } = await pool.query(
    `SELECT * FROM likes WHERE id = $1 AND receiver_id = $2`,
    [req.params.id, receiver]
  );
  if (!rows[0]) return res.status(404).json({ error: "Like not found." });

  if (action === "accept") {
    const matchId = uid();
    await pool.query(
      `INSERT INTO matches (id, user1_id, user2_id) VALUES ($1, $2, $3)`,
      [matchId, receiver, rows[0].sender_id]
    );
    if (rows[0].message) {
      await pool.query(
        `INSERT INTO messages (id, match_id, sender_id, text) VALUES ($1, $2, $3, $4)`,
        [uid(), matchId, rows[0].sender_id, rows[0].message]
      );
    }
  }

  await pool.query(`DELETE FROM likes WHERE id = $1`, [req.params.id]);
  res.json({ ok: true, matched: action === "accept" });
});

// ─── Matches ──────────────────────────────────────────────────────────────────

app.get("/api/matches", requireAuth(), async (req, res) => {
  const id = userId(req);
  const { rows } = await pool.query(
    `SELECT m.id AS match_id, m.matched_at,
            u.id AS partner_id, u.name,
            p.age, p.gender, p.department, p.photos,
            (SELECT text       FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_message,
            (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
     FROM matches m
     JOIN users u    ON u.id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
     JOIN profiles p ON p.user_id = u.id
     WHERE m.user1_id = $1 OR m.user2_id = $1
     ORDER BY COALESCE(last_message_at, m.matched_at) DESC`,
    [id]
  );
  res.json({ matches: rows });
});

app.delete("/api/matches/:id", requireAuth(), async (req, res) => {
  await pool.query(`DELETE FROM matches WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

app.get("/api/matches/:id/messages", requireAuth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ messages: rows });
});

app.post("/api/matches/:id/messages", requireAuth(), async (req, res) => {
  const sender = userId(req);
  const { text, imageUrl } = req.body;
  if (!text?.trim() && !imageUrl) return res.status(400).json({ error: "Empty message." });

  const { rows } = await pool.query(
    `INSERT INTO messages (id, match_id, sender_id, text, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [uid(), req.params.id, sender, text || "", imageUrl || null]
  );
  res.json(rows[0]);
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.post("/api/reports", requireAuth(), async (req, res) => {
  const { reportedUserId, reason, details } = req.body;
  await pool.query(
    `INSERT INTO reports (id, reporter_id, reported_user_id, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [uid(), userId(req), reportedUserId, reason, details || null]
  );
  res.json({ ok: true });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) console.warn("[warn] ADMIN_TOKEN not set – admin routes disabled");

function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
}

app.get("/api/admin/users", isAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.status, u.id_card, u.created_at,
            p.age, p.gender, p.department, p.year,
            COUNT(r.id)::int AS reports_count
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN reports r  ON r.reported_user_id = u.id AND r.status = 'pending'
     GROUP BY u.id, p.age, p.gender, p.department, p.year
     ORDER BY u.created_at DESC`
  );
  res.json({ users: rows });
});

app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
  const { status } = req.body;
  await pool.query(`UPDATE users SET status = $2 WHERE id = $1`, [req.params.id, status]);
  if (status === "banned") {
    await pool.query(
      `DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1`,
      [req.params.id]
    );
  }
  res.json({ ok: true });
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default app;

// Only start the HTTP server when running locally (tsx server.ts)
if (!process.env.VERCEL) {
  initDb().then(() => {
    app.listen(PORT, () => console.log(`cvr.connect API on :${PORT}`));
  });
}
