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
    const email = {
        from: transaction.mail_from,
        to: transaction.rcpt_to,
        subject: transaction.header.get('subject'),
        headers: transaction.header.headers_decoded,
        body: transaction.body ? transaction.body.bodytext : '',
        html: transaction.body ? transaction.body.bodytext : '', // Haraka body handling can be complex, simplifying for now
        date: new Date().toISOString()
    };

    // In a real scenario, we should parse the body parts (text/html) better.
    // For now, we send what we have.

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
