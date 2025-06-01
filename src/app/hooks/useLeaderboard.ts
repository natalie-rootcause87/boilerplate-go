import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData, mutateData } from '../utils/api';
import { LeaderboardResponse } from '../../types/leaderboard';

export function useLeaderboard() {
  const queryClient = useQueryClient();

  const {
    data: response,
    error,
    isLoading,
  } = useQuery<LeaderboardResponse, Error>({
    queryKey: ['leaderboard'],
    queryFn: () => fetchData('/leaderboard'),
  });

  const submitScore = useMutation({
    mutationFn: (data: { playerName: string; score: number }) =>
      mutateData<LeaderboardResponse, { name: string; level: number }>('/leaderboard', {
        name: data.playerName,
        level: data.score
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  return {
    leaderboard: response?.entries || [],
    error: response?.error || error?.message || '',
    isLoading,
    submitScore,
  };
} 