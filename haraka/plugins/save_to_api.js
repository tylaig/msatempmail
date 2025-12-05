const http = require('http');

exports.register = function () {
    this.register_hook('queue', 'save_email');
    this.load_save_to_api_ini();
}

exports.load_save_to_api_ini = function () {
    this.cfg = this.config.get('save_to_api.ini', {
        booleans: [
            '-api.https',
        ],
    },
        () => {
            this.load_save_to_api_ini();
        });
}

exports.save_email = function (next, connection) {
    const transaction = connection.transaction;
    
    // Get the raw email stream
    let rawEmail = '';
    let bodyText = '';
    let bodyHtml = '';
    
    // Try to get body content
    if (transaction.body) {
        if (typeof transaction.body.bodytext === 'string') {
            rawEmail = transaction.body.bodytext;
        } else if (Buffer.isBuffer(transaction.body.bodytext)) {
            rawEmail = transaction.body.bodytext.toString('utf-8');
        }
        
        // Try to extract text and html from body if available
        if (transaction.body && transaction.body.bodytext) {
            const bodyContent = typeof transaction.body.bodytext === 'string' 
                ? transaction.body.bodytext 
                : transaction.body.bodytext.toString('utf-8');
            
            // Get boundary from content-type header if multipart
            let boundary = null;
            const contentType = transaction.header.get('content-type') || '';
            const boundaryMatch = contentType.match(/boundary\s*=\s*["']?([^"'\s;]+)/i);
            if (boundaryMatch) {
                boundary = boundaryMatch[1];
            }
            
            // Simple parsing for multipart emails
            // Look for HTML parts - improved regex to handle various formats
            const htmlPattern = boundary 
                ? new RegExp(`Content-Type:\\s*text/html[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)(?=--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`, 'i')
                : /Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=--[^\r\n]+|Content-Type:|$)/i;
            
            const htmlMatch = bodyContent.match(htmlPattern);
            if (htmlMatch && htmlMatch[1]) {
                bodyHtml = htmlMatch[1]
                    .replace(/Content-Transfer-Encoding:[\s\S]*?\r?\n/gi, '')
                    .replace(/Content-Type:[\s\S]*?\r?\n/gi, '')
                    .replace(/charset=[^\r\n]*/gi, '')
                    .replace(/^[\r\n]+|[\r\n]+$/g, '')
                    .trim();
            }
            
            // Look for text parts - improved regex
            const textPattern = boundary
                ? new RegExp(`Content-Type:\\s*text/plain[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)(?=--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|Content-Type:|$)`, 'i')
                : /Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=--[^\r\n]+|Content-Type:|$)/i;
            
            const textMatch = bodyContent.match(textPattern);
            if (textMatch && textMatch[1]) {
                bodyText = textMatch[1]
                    .replace(/Content-Transfer-Encoding:[\s\S]*?\r?\n/gi, '')
                    .replace(/Content-Type:[\s\S]*?\r?\n/gi, '')
                    .replace(/charset=[^\r\n]*/gi, '')
                    .replace(/^[\r\n]+|[\r\n]+$/g, '')
                    .trim();
            }
            
            // If no multipart found, use the body as text or html
            if (!bodyHtml && !bodyText && bodyContent) {
                const cleanContent = bodyContent.trim();
                // Check if it's HTML
                if (cleanContent.startsWith('<') || cleanContent.includes('<html') || cleanContent.includes('<body') || cleanContent.includes('<!DOCTYPE')) {
                    bodyHtml = cleanContent;
                } else if (cleanContent.length > 0) {
                    bodyText = cleanContent;
                }
            }
        }
    }
    
    const email = {
        from: transaction.mail_from,
        to: transaction.rcpt_to,
        subject: transaction.header.get('subject'),
        headers: transaction.header.headers_decoded,
        body: rawEmail, // Keep raw body for reference
        text: bodyText,
        html: bodyHtml,
        date: new Date().toISOString()
    };

    const postData = JSON.stringify(email);

    const options = {
        hostname: this.cfg.api.hostname || 'api',
        port: this.cfg.api.port || 3000,
        path: this.cfg.api.path || '/internal/save-email',
        method: this.cfg.api.method || 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': 'Bearer ' + (this.cfg.api.auth_token || 'internal_secret_key')
        }
    };

    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            connection.loginfo(this, 'Email saved to API');
            next(OK);
        } else {
            connection.logerror(this, 'API returned error: ' + res.statusCode);
            next(DENYSOFT, 'Internal Server Error');
        }
    });

    req.on('error', (e) => {
        connection.logerror(this, 'Problem with request: ' + e.message);
        next(DENYSOFT, 'Internal Server Error');
    });

    req.write(postData);
    req.end();
}
