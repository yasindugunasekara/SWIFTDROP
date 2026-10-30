import { createClient } from 'redis';
import { config } from './env.js';

export const redisClient = createClient({
  url: config.redisUrl
});

redisClient.on('error', (err) => {
  console.warn('⚠️ Redis client error / connection pending:', err.message);
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis client connected successfully');
    }
  } catch (error) {
    console.warn('⚠️ Redis connection skipped in standalone mode');
  }
};
