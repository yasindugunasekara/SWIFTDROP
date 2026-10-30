import amqplib from 'amqplib';
import { config } from './env.js';

let channel: amqplib.Channel | null = null;
let connection: amqplib.Connection | null = null;

export const connectRabbitMQ = async () => {
  try {
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ broker connected successfully');
    return { connection, channel };
  } catch (error) {
    console.warn('⚠️ RabbitMQ connection pending / unavailable (will retry on demand)');
    return null;
  }
};

export const getRabbitMQChannel = () => channel;
