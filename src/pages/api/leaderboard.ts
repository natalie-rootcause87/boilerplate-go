import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import { LeaderboardEntry, LeaderboardResponse } from '../../types/leaderboard';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse>
) {
  try {
    const client = await clientPromise;
    const db = client.db('donut-go');
    const collection = db.collection<LeaderboardEntry>('leaderboard');

    if (req.method === 'GET') {
      // Get top 10 scores
      const entries = await collection
        .find({})
        .sort({ level: -1, createdAt: -1 })
        .limit(10)
        .toArray();

      return res.status(200).json({ entries });
    } else if (req.method === 'POST') {
      const { name, level, updateHighestOnly } = req.body;

      // Validate input
      if (!name || typeof name !== 'string' || name.length > 20) {
        return res.status(400).json({
          entries: [],
          error: 'Invalid name. Must be a string with maximum length of 20 characters.'
        });
      }

      if (!level || typeof level !== 'number' || level < 1) {
        return res.status(400).json({
          entries: [],
          error: 'Invalid level. Must be a positive number.'
        });
      }

      // Check for existing entry with the same name
      const existingEntry = await collection.findOne({ name: name.trim() });
      
      if (existingEntry && updateHighestOnly) {
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
        .sort({ level: -1, createdAt: -1 })
        .limit(10)
        .toArray();

      return res.status(200).json({ entries });
    }

    return res.status(405).json({ entries: [], error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ entries: [], error: 'Internal server error' });
  }
} 