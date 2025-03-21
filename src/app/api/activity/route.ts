import { NextResponse } from 'next/server';
import GameState from '../../utils/GameState';
import EventManager from '../../utils/EventManager';

let gameState = new GameState();

export async function POST() {
  try {
    gameState = EventManager.triggerEvent(gameState);
    return NextResponse.json({ gameState });
  } catch (error) {
    return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 500 });
  }
}
