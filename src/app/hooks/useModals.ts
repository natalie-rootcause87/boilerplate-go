import { useReducer } from 'react';
import { LogEntry } from '../utils/GameState';
import Spell from '../utils/Spell';

export type ModalType = 'entry' | 'spell' | 'spellReplace' | 'spellChoice' | 'version' | 'none';

export interface ModalData {
  entry?: LogEntry[];
  spell?: Spell;
  spellName?: string;
  version?: string;
}

export interface ModalState {
  type: ModalType;
  isOpen: boolean;
  data?: ModalData;
}

type ModalAction = 
  | { type: 'OPEN_MODAL'; payload: { type: ModalType; data?: ModalData } }
  | { type: 'CLOSE_MODAL' };

const initialState: ModalState = {
  type: 'none',
  isOpen: false,
  data: undefined,
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        type: action.payload.type,
        isOpen: true,
        data: action.payload.data,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        isOpen: false,
      };
    default:
      return state;
  }
}

export function useModals() {
  const [modalState, dispatch] = useReducer(modalReducer, initialState);

  const openModal = (type: ModalType, data?: ModalData) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type, data } });
  };

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  return {
    modalState,
    openModal,
    closeModal,
  };
} 