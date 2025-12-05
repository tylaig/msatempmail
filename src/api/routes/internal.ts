import { Elysia, t } from 'elysia';
import { redis, getMailboxKey, getMessageKey, EXPIRATION_TIME } from '../redis';
import { randomUUID } from 'crypto';

export const internalRoutes = new Elysia({ prefix: '/internal' })
    .onBeforeHandle(({ request, set }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer internal_secret_key') {
            set.status = 401;
            return 'Unauthorized';
        }
    })
    .post('/save-email', async ({ body, set }) => {
        const { to, from, subject, body: emailBody, html, headers, date } = body as any;

        // 'to' comes as an object or array from Haraka usually, we need to parse the address
        // Assuming Haraka sends a simplified object or we parse it here.
        // For this MVP, let's assume 'to' contains the recipient object with 'text' property or similar
        // Adjust based on actual Haraka plugin output.

        // In our plugin we sent: to: transaction.rcpt_to
        // rcpt_to is an array of objects in Haraka.

        const recipients = Array.isArray(to) ? to : [to];

        for (const recipient of recipients) {
            const address = recipient.address || recipient.original || recipient; // Handle different formats
            if (!address) continue;

            const mailboxKey = getMailboxKey(address);

            // Check if mailbox exists (has TTL)
            const exists = await redis.exists(mailboxKey);
            if (!exists) {
                console.log(`Mailbox ${address} does not exist or expired. Skipping.`);
                continue;
            }

            const messageId = randomUUID();
            const messageKey = getMessageKey(messageId);

            const messageData = {
                id: messageId,
                from: typeof from === 'object' ? from.address : from,
                to: address,
                subject,
                text: emailBody,
                html,
                date: date || new Date().toISOString(),
                headers: JSON.stringify(headers)
            };

            // Save message
            await redis.call('JSON.SET', messageKey, '$', JSON.stringify(messageData));
            await redis.expire(messageKey, EXPIRATION_TIME);

            // Add to mailbox list
            await redis.rpush(mailboxKey, messageId);

            // Publish event for WebSocket
            await redis.publish(`inbox:${address}`, JSON.stringify({ type: 'NEW_EMAIL', data: messageData }));

            console.log(`Email saved for ${address}`);
        }

        return { success: true };
    }, {
        body: t.Object({
            to: t.Any(),
            from: t.Any(),
            subject: t.String(),
            body: t.String(),
            html: t.String(),
            headers: t.Any(),
            date: t.String()
        }),
        detail: {
            summary: 'Save incoming email',
            description: 'Internal endpoint called by Haraka SMTP server to save received emails to Redis.',
            tags: ['Internal'],
            security: [{ BearerAuth: [] }]
        }
    });
