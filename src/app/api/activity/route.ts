import { NextResponse } from 'next/server';
import GameState from '../../utils/GameState';

// Initialize game state in memory (this will be per-session in production)
const sessions = new Map<string, GameState>();

export async function GET(request: Request) {
  try {
    // Get or create session ID from cookies
    const sessionId = request.headers.get('x-session-id') || 'default';
    
    // Get or create game state for this session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new GameState());
    }
    
    const gameState = sessions.get(sessionId)!;
    return NextResponse.json(gameState);
  } catch (error) {
    console.error('GET /api/activity error:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionId = request.headers.get('x-session-id') || 'default';
    const body = await request.json();
    
    let updatedState: GameState;
    if (body instanceof GameState) {
      updatedState = body;
    } else {
      updatedState = Object.assign(new GameState(), body);
    }
    
    // Update session state
    sessions.set(sessionId, updatedState);
    
    return NextResponse.json(updatedState);
  } catch (error) {
    console.error('POST /api/activity error:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 500 });
  }
}
