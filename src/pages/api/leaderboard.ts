import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import { LeaderboardEntry, LeaderboardResponse } from '../../types/leaderboard';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse>
) {
  try {
    // Try connecting to MongoDB with more detailed error logging
    let client;
    try {
      console.log('Attempting MongoDB connection...');
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }
      console.log('MongoDB URI exists, attempting connection...');
      client = await clientPromise;
      console.log('MongoDB connection successful');
    } catch (error) {
      const mongoError = error as Error;
      console.error('MongoDB connection error:', {
        error: mongoError.toString(),
        message: mongoError.message,
        stack: mongoError.stack,
        envVars: {
          hasMongoUri: !!process.env.MONGODB_URI,
          nodeEnv: process.env.NODE_ENV
        }
      });
      return res.status(500).json({ 
        entries: [], 
        error: `Database connection failed: ${mongoError.message}` 
      });
    }

    const db = client.db('donut-go');
    const collection = db.collection<LeaderboardEntry>('leaderboard');

    if (req.method === 'GET') {
      try {
        const entries = await collection
          .find({})
          .sort({ level: -1, createdAt: -1 })
          .limit(10)
          .toArray();

        return res.status(200).json({ entries });
      } catch (error) {
        const mongoError = error as Error;
        console.error('MongoDB query error:', {
          error: mongoError.toString(),
          method: 'GET',
          operation: 'find'
        });
        return res.status(500).json({ 
          entries: [], 
          error: 'Failed to fetch leaderboard. Please try again later.' 
        });
      }
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

      try {
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
      } catch (error) {
        const mongoError = error as Error;
        console.error('MongoDB operation error:', {
          error: mongoError.toString(),
          method: 'POST',
          name: name.trim(),
          level
        });
        return res.status(500).json({ 
          entries: [], 
          error: 'Failed to update leaderboard. Please try again later.' 
        });
      }
    }

    return res.status(405).json({ entries: [], error: 'Method not allowed' });
  } catch (error) {
    const serverError = error as Error;
    console.error('Unexpected error in leaderboard API:', {
      error: serverError.toString(),
      message: serverError.message,
      stack: serverError.stack,
      method: req.method
    });
    return res.status(500).json({ 
      entries: [], 
      error: 'An unexpected error occurred. Please try again later.' 
    });
  }
} 