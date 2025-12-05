import { Elysia, t } from 'elysia';
import { redis, getMailboxKey, getMessageKey, EXPIRATION_TIME } from '../redis';

export const mailboxRoutes = new Elysia({ prefix: '/mailbox' })
    .post('/create', async ({ body }) => {
        const { customName } = body as { customName?: string };

        // Generate random address or use custom
        let randomPart = Math.random().toString(36).substring(2, 8);
        if (customName && /^[a-zA-Z0-9._-]+$/.test(customName)) {
            randomPart = customName;
        }

        // In a real app, domain should be dynamic or from config
        const domain = process.env.MAIL_DOMAIN || 'localhost';
        const address = `${randomPart}@${domain}`;

        const mailboxKey = getMailboxKey(address);

        // Create mailbox (empty list) and set TTL
        await redis.del(mailboxKey); // Ensure clean start
        await redis.rpush(mailboxKey, "INIT"); // Placeholder to create key
        await redis.lpop(mailboxKey); // Remove placeholder
        await redis.expire(mailboxKey, EXPIRATION_TIME);

        return { address, ttl: EXPIRATION_TIME };
    }, {
        detail: {
            summary: 'Create a temporary mailbox',
            description: 'Generates a random email address and initializes it in Redis with a TTL.',
            tags: ['Mailbox']
        }
    })
    .get('/:address', async ({ params: { address } }) => {
        const mailboxKey = getMailboxKey(address);
        const messageIds = await redis.lrange(mailboxKey, 0, -1);

        if (!messageIds || messageIds.length === 0) {
            // Check if mailbox exists at all (TTL check)
            const exists = await redis.exists(mailboxKey);
            if (!exists) return { messages: [], expired: true };
            return { messages: [] };
        }

        const messages = [];
        for (const id of messageIds) {
            const messageKey = getMessageKey(id);
            const msg = await redis.call('JSON.GET', messageKey);
            if (msg) {
                messages.push(JSON.parse(msg as string));
            }
        }

        // Reverse to show newest first
        return { messages: messages.reverse() };
    }, {
        detail: {
            summary: 'List messages in a mailbox',
            description: 'Retrieves all emails for a specific address. Returns an empty list if no messages found.',
            tags: ['Mailbox']
        }
    });

export const messageRoutes = new Elysia({ prefix: '/message' })
    .get('/:id', async ({ params: { id }, error }) => {
        const messageKey = getMessageKey(id);
        const msg = await redis.call('JSON.GET', messageKey);

        if (!msg) return error(404, 'Message not found');

        return JSON.parse(msg as string);
    }, {
        detail: {
            summary: 'Get message details',
            description: 'Retrieves the full content (headers, body, html) of a specific email by ID.',
            tags: ['Message']
        }
    });
