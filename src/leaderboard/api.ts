import type { ComputerDifficulty } from "../player/ComputerPlayer.js";

export type LeaderboardEntry = {
  name: string;
  points: number;
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
};

const LEADERBOARD_API_BASE = "/api/leaderboard";

async function parseLeaderboardResponse(response: Response): Promise<LeaderboardResponse> {
  if (!response.ok) {
    throw new Error(`Leaderboard request failed with status ${response.status}.`);
  }

  return response.json() as Promise<LeaderboardResponse>;
}

export async function fetchLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const response = await fetch(LEADERBOARD_API_BASE, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await parseLeaderboardResponse(response);
  return payload.entries;
}

export async function recordLeaderboardWin(
  playerName: string,
  difficulty: ComputerDifficulty,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${LEADERBOARD_API_BASE}/wins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      playerName,
      difficulty,
      resultStatus: "checkmate",
    }),
  });
  const payload = await parseLeaderboardResponse(response);
  return payload.entries;
}

export async function revokeLeaderboardWin(
  playerName: string,
  difficulty: ComputerDifficulty,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${LEADERBOARD_API_BASE}/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      playerName,
      difficulty,
    }),
  });
  const payload = await parseLeaderboardResponse(response);
  return payload.entries;
}
