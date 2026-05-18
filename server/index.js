import { createReadStream, existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const dataDir = path.join(projectRoot, "data");
const databasePath = path.join(dataDir, "leaderboard.sqlite");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3001");
const leaderboardLimit = 5;
const pointsByDifficulty = {
  easy: 1,
  medium: 2,
  hard: 4,
};

mkdirSync(dataDir, { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    player_name VARCHAR(100) PRIMARY KEY,
    points INT NOT NULL DEFAULT 0
  )
`);

const selectTopEntriesStatement = database.prepare(`
  SELECT player_name, points
  FROM leaderboard
  ORDER BY points DESC, player_name ASC
  LIMIT ?
`);

const upsertWinStatement = database.prepare(`
  INSERT INTO leaderboard (player_name, points)
  VALUES (?, ?)
  ON CONFLICT(player_name) DO UPDATE SET points = leaderboard.points + excluded.points
`);

const subtractPointsStatement = database.prepare(`
  UPDATE leaderboard
  SET points = points - ?
  WHERE player_name = ?
`);

const deleteEmptyRowsStatement = database.prepare(`
  DELETE FROM leaderboard
  WHERE player_name = ? AND points <= 0
`);

const allowedDifficulties = new Set(Object.keys(pointsByDifficulty));

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response) {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end();
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(message);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", chunk => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const rawBody = Buffer.concat(chunks).toString("utf8");
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function getLeaderboardEntries() {
  return selectTopEntriesStatement.all(leaderboardLimit).map(row => ({
    name: row.player_name,
    points: row.points,
  }));
}

function normalisePlayerName(playerName) {
  if (typeof playerName !== "string") {
    return null;
  }

  const trimmedName = playerName.trim();
  return trimmedName.length > 0 ? trimmedName.slice(0, 100) : null;
}

function getDifficultyPoints(difficulty) {
  if (typeof difficulty !== "string" || !allowedDifficulties.has(difficulty)) {
    return null;
  }

  return pointsByDifficulty[difficulty];
}

function addLeaderboardWin(playerName, points) {
  database.exec("BEGIN");
  try {
    upsertWinStatement.run(playerName, points);
    const entries = getLeaderboardEntries();
    database.exec("COMMIT");
    return entries;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function revokeLeaderboardWin(playerName, points) {
  database.exec("BEGIN");
  try {
    subtractPointsStatement.run(points, playerName);
    deleteEmptyRowsStatement.run(playerName);
    const entries = getLeaderboardEntries();
    database.exec("COMMIT");
    return entries;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function handleApiRequest(request, response, pathname) {
  if (request.method === "OPTIONS") {
    sendNoContent(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/leaderboard") {
    sendJson(response, 200, { entries: getLeaderboardEntries() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/leaderboard/wins") {
    let body;

    try {
      body = await readRequestBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON request body." });
      return;
    }

    const playerName = normalisePlayerName(body.playerName);
    const points = getDifficultyPoints(body.difficulty);

    if (body.resultStatus !== "checkmate") {
      sendJson(response, 400, { error: "Only checkmate wins can be recorded." });
      return;
    }

    if (!playerName) {
      sendJson(response, 400, { error: "A non-blank player name is required." });
      return;
    }

    if (points === null) {
      sendJson(response, 400, { error: "A valid difficulty is required." });
      return;
    }

    sendJson(response, 200, {
      entries: addLeaderboardWin(playerName, points),
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/leaderboard/revoke") {
    let body;

    try {
      body = await readRequestBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON request body." });
      return;
    }

    const playerName = normalisePlayerName(body.playerName);
    const points = getDifficultyPoints(body.difficulty);

    if (!playerName) {
      sendJson(response, 400, { error: "A non-blank player name is required." });
      return;
    }

    if (points === null) {
      sendJson(response, 400, { error: "A valid difficulty is required." });
      return;
    }

    sendJson(response, 200, {
      entries: revokeLeaderboardWin(playerName, points),
    });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".mp3":
      return "audio/mpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function tryServeStaticFile(request, response, pathname) {
  if (!existsSync(distDir)) {
    sendText(response, 503, "Frontend build not found. Run `npm run build` first.");
    return true;
  }

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalisedPath = path.normalize(requestedPath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  let filePath = path.join(distDir, normalisedPath);

  try {
    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    filePath = path.join(distDir, "index.html");
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
  });

  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  const fileStream = createReadStream(filePath);
  fileStream.on("error", () => {
    if (!response.headersSent) {
      sendText(response, 404, "File not found.");
      return;
    }

    response.destroy();
  });
  fileStream.pipe(response);
  return true;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    await handleApiRequest(request, response, requestUrl.pathname);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed.");
    return;
  }

  await tryServeStaticFile(request, response, requestUrl.pathname);
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use on ${host}.`);
    process.exitCode = 1;
    return;
  }

  console.error("Server failed to start:", error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Chess server listening on http://${host}:${port}`);
});
