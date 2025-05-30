export interface LeaderboardEntry {
  name: string;
  level: number;
  createdAt: Date;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  error?: string;
} 