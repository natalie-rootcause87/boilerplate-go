import { useReducer } from 'react';
import { LogEntry } from '../utils/GameState';

interface GameState {
  gameStarted: boolean;
  isTurnPaused: boolean;
  currentEntries: LogEntry[];
  hasSubmittedScore: boolean;
  playerName: string;
}

type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'PAUSE_TURN' }
  | { type: 'UNPAUSE_TURN' }
  | { type: 'SET_ENTRIES'; payload: LogEntry[] }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SUBMIT_SCORE' };

const initialState: GameState = {
  gameStarted: false,
  isTurnPaused: false,
  currentEntries: [],
  hasSubmittedScore: false,
  playerName: '',
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        gameStarted: true,
        currentEntries: [],
      };
    case 'END_GAME':
      return {
        ...state,
        gameStarted: false,
        currentEntries: [],
      };
    case 'PAUSE_TURN':
      return {
        ...state,
        isTurnPaused: true,
      };
    case 'UNPAUSE_TURN':
      return {
        ...state,
        isTurnPaused: false,
      };
    case 'SET_ENTRIES':
      return {
        ...state,
        currentEntries: action.payload,
      };
    case 'SET_PLAYER_NAME':
      return {
        ...state,
        playerName: action.payload,
      };
    case 'SUBMIT_SCORE':
      return {
        ...state,
        hasSubmittedScore: true,
      };
    default:
      return state;
  }
}

export function useGameActions() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startGame = () => dispatch({ type: 'START_GAME' });
  const endGame = () => dispatch({ type: 'END_GAME' });
  const pauseTurn = () => dispatch({ type: 'PAUSE_TURN' });
  const unpauseTurn = () => dispatch({ type: 'UNPAUSE_TURN' });
  const setEntries = (entries: LogEntry[]) => dispatch({ type: 'SET_ENTRIES', payload: entries });
  const setPlayerName = (name: string) => dispatch({ type: 'SET_PLAYER_NAME', payload: name });
  const submitScore = () => dispatch({ type: 'SUBMIT_SCORE' });

  return {
    ...state,
    startGame,
    endGame,
    pauseTurn,
    unpauseTurn,
    setEntries,
    setPlayerName,
    submitScore,
  };
} 