import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

export const redis = new Redis({
    host: redisHost,
    port: redisPort,
});

export const getMailboxKey = (address: string) => `mailbox:${address}`;
export const getMessageKey = (id: string) => `message:${id}`;

export const EXPIRATION_TIME = 60 * 15; // 15 minutes
