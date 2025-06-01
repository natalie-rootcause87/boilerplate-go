import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData, mutateData } from '../utils/api';
import GameState, { LogEntry } from '../utils/GameState';
import Player from '../utils/Player';
import { Monster } from '../utils/Monster';

interface GameStateResponse {
  player: Player;
  monster: Monster | null;
  gameLog: LogEntry[][];
  isGameOver: boolean;
  unlockedSpells: string[];
  lastActionType: string | null;
}

export function useGameState() {
  const queryClient = useQueryClient();

  const {
    data: gameState,
    error,
    isLoading,
  } = useQuery<GameState, Error>({
    queryKey: ['gameState'],
    queryFn: async () => {
      const data = await fetchData<GameStateResponse>('/activity');
      const newState = new GameState();
      // Reconstruct the Player class with its methods
      newState.player = Object.assign(new Player(), data.player);
      // Copy other properties
      newState.monster = data.monster;
      newState.gameLog = data.gameLog;
      newState.isGameOver = data.isGameOver;
      newState.unlockedSpells = data.unlockedSpells;
      newState.lastActionType = data.lastActionType;
      return newState;
    },
    // Disable automatic refetching since we'll manage game state updates manually
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  const updateGameState = useMutation({
    mutationFn: async (newState: Partial<GameState>) => {
      const data = await mutateData<GameStateResponse, Partial<GameState>>('/activity', newState);
      const updatedState = new GameState();
      // Reconstruct the Player class with its methods
      updatedState.player = Object.assign(new Player(), data.player);
      // Copy other properties
      updatedState.monster = data.monster;
      updatedState.gameLog = data.gameLog;
      updatedState.isGameOver = data.isGameOver;
      updatedState.unlockedSpells = data.unlockedSpells;
      updatedState.lastActionType = data.lastActionType;
      return updatedState;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['gameState'], newState);
    },
  });

  return {
    gameState,
    error: error?.message || '',
    isLoading,
    updateGameState,
  };
} 