import { NextRequest, NextResponse } from 'next/server';
import GameState from '../../utils/GameState';
import EventManager from '../../utils/EventManager';

let gameState = new GameState();

export async function POST(req: NextRequest) {
  try {
    gameState = EventManager.triggerEvent(gameState);
    return NextResponse.json({ gameState });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export function middleware(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }
}
