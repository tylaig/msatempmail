import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { internalRoutes } from './routes/internal';
import { mailboxRoutes, messageRoutes } from './routes/mailbox';
import { redis } from './redis';

const app = new Elysia()
    .use(cors())
    .use(swagger())
    .use(internalRoutes)
    .use(mailboxRoutes)
    .use(messageRoutes)
    .ws('/ws/inbox/:address', {
        open(ws) {
            const { address } = ws.data.params;
            console.log(`WS connected for ${address}`);
            ws.subscribe(`inbox:${address}`);
        },
        message(ws, message) {
            // Handle incoming messages if needed
        },
        close(ws) {
            const { address } = ws.data.params;
            console.log(`WS disconnected for ${address}`);
            ws.unsubscribe(`inbox:${address}`);
        }
    })
    .listen(3000);

// Subscribe to Redis Pub/Sub for broadcasting to WS
const subRedis = redis.duplicate();
subRedis.psubscribe('inbox:*', (err, count) => {
    if (err) console.error('Failed to psubscribe: %s', err.message);
});

subRedis.on('pmessage', (pattern, channel, message) => {
    // channel is like inbox:address
    // We need to broadcast to the specific WS topic
    // Elysia WS uses a publish method on the server instance
    app.server?.publish(channel, message);
});

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);