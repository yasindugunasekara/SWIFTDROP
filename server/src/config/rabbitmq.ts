import amqplib from 'amqplib';
import { config } from './env.js';

type BrokerConnection = amqplib.ChannelModel;
type BrokerChannel = amqplib.Channel;
type BrokerConfirmChannel = amqplib.ConfirmChannel;

interface Broker {
  connection: BrokerConnection;
  channel: BrokerChannel;
}

let connection: BrokerConnection | null = null;
let channel: BrokerChannel | null = null;
let connecting: Promise<Broker | null> | null = null;

const resetBroker = () => {
  connection = null;
  channel = null;
};

/**
 * Connect once per process.
 *
 * Every worker in this process (notification consumer and webhook worker) calls
 * this function. Concurrent and later calls reuse the same connection instead
 * of opening a second one. Consumers that need isolation create additional
 * channels on this shared connection with createRabbitMQChannel().
 */
export const connectRabbitMQ = async (): Promise<Broker | null> => {
  if (connecting) return connecting;

  connecting = (async () => {
    let activeConnection = connection;
    const isNewConnection = !activeConnection;

    try {
      if (!activeConnection) {
        activeConnection = await amqplib.connect(config.rabbitmqUrl);
        activeConnection.on('close', () => {
          console.warn('⚠️ RabbitMQ connection closed');
          resetBroker();
        });
        activeConnection.on('error', (error: Error) => {
          console.warn('⚠️ RabbitMQ connection error:', error.message);
        });
        connection = activeConnection;
      }

      let activeChannel = channel;
      if (!activeChannel) {
        activeChannel = await activeConnection.createChannel();
        activeChannel.on('close', () => {
          if (channel === activeChannel) channel = null;
        });
        activeChannel.on('error', (error: Error) => {
          console.warn('⚠️ RabbitMQ default channel error:', error.message);
        });
        channel = activeChannel;
      }

      if (isNewConnection) {
        console.log('✅ RabbitMQ broker connected successfully');
      }

      return { connection: activeConnection, channel: activeChannel };
    } catch {
      // Only close a connection this attempt created. An existing connection may
      // still be used by dedicated consumer/publisher channels.
      if (activeConnection && isNewConnection) {
        try {
          await activeConnection.close();
        } catch {
          // Ignore close failures; the connection is being discarded anyway.
        }
      }
      console.warn('⚠️ RabbitMQ connection pending / unavailable (will retry on demand)');
      resetBroker();
      return null;
    }
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
};

export const getRabbitMQChannel = () => channel;

/** Dedicated consumer channel on the shared connection. */
export const createRabbitMQChannel = async (): Promise<BrokerChannel | null> => {
  const broker = await connectRabbitMQ();
  if (!broker) return null;

  try {
    const dedicated = await broker.connection.createChannel();
    dedicated.on('error', (error: Error) => {
      console.warn('⚠️ RabbitMQ dedicated channel error:', error.message);
    });
    return dedicated;
  } catch (error) {
    console.warn('⚠️ Unable to create a RabbitMQ channel:', describe(error));
    return null;
  }
};

/**
 * Publisher-confirm channel. The notification consumer uses this for retry and
 * DLQ republishing so the original message is acknowledged only after the
 * broker has confirmed the copy.
 */
export const createRabbitMQConfirmChannel = async (): Promise<BrokerConfirmChannel | null> => {
  const broker = await connectRabbitMQ();
  if (!broker) return null;

  try {
    const confirm = await broker.connection.createConfirmChannel();
    confirm.on('error', (error: Error) => {
      console.warn('⚠️ RabbitMQ confirm channel error:', error.message);
    });
    return confirm;
  } catch (error) {
    console.warn('⚠️ Unable to create a RabbitMQ confirm channel:', describe(error));
    return null;
  }
};

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
