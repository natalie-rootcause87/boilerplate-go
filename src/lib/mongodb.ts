import { MongoClient } from 'mongodb';
import getConfig from 'next/config';

// Try multiple ways to get the MongoDB URI
const { serverRuntimeConfig } = getConfig() || {};
const MONGODB_URI = process.env.MONGODB_URI || serverRuntimeConfig?.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MongoDB connection error:', {
    NODE_ENV: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasServerRuntimeUri: !!serverRuntimeConfig?.MONGODB_URI,
    envKeys: Object.keys(process.env).filter(key => key.includes('MONGO')),
    allEnvKeys: Object.keys(process.env)
  });
  throw new Error(
    'MongoDB URI is not defined. Please ensure MONGODB_URI environment variable is set in AWS Amplify environment variables.'
  );
}

const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  try {
    client = new MongoClient(MONGODB_URI, options);
    clientPromise = client.connect();
    console.log('MongoDB client initialized in production mode');
  } catch (error) {
    console.error('Error initializing MongoDB client:', error);
    throw error;
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 