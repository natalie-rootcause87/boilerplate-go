import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { LeaderboardEntry } from '../../../types/leaderboard';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('donut-go');
    const collection = db.collection<LeaderboardEntry>('leaderboard');

    const entries = await collection
      .find({})
      .sort({ level: -1, createdAt: 1 })
      .limit(10)
      .toArray();

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ 
      entries: [], 
      error: 'Failed to fetch leaderboard. Please try again later.' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, level } = await request.json();

    // Validate input
    if (!name || typeof name !== 'string' || name.length > 20) {
      return NextResponse.json({
        entries: [],
        error: 'Invalid name. Must be a string with maximum length of 20 characters.'
      }, { status: 400 });
    }

    if (!level || typeof level !== 'number' || level < 1) {
      return NextResponse.json({
        entries: [],
        error: 'Invalid level. Must be a positive number.'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('donut-go');
    const collection = db.collection<LeaderboardEntry>('leaderboard');

    // Check for existing entry with the same name
    const existingEntry = await collection.findOne({ name: name.trim() });
    
    if (existingEntry) {
      // Only update if new level is higher
      if (level > existingEntry.level) {
        await collection.updateOne(
          { name: name.trim() },
          { $set: { level, createdAt: new Date() } }
        );
      }
    } else {
      // Insert new entry
      const newEntry: LeaderboardEntry = {
        name: name.trim(),
        level,
        createdAt: new Date()
      };
      await collection.insertOne(newEntry);
    }

    // Get updated top 10
    const entries = await collection
      .find({})
      .sort({ level: -1, createdAt: 1 })
      .limit(10)
      .toArray();

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('POST /api/leaderboard error:', error);
    return NextResponse.json({ 
      entries: [], 
      error: 'Failed to update leaderboard. Please try again later.' 
    }, { status: 500 });
  }
} 