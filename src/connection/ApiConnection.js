const requestPromise = require('request-promise');

module.exports = (wrappers, host, port, protocol) => {
    let baseUrl = `${protocol}://${host}`;
    if (port) {
        baseUrl += `:${port}`;
    }

    async function get(path, qs, label, headers = { Accept: 'application/json' }) {
        const requestParams = {
            uri: `${baseUrl}/${path}`,
            qsStringifyOptions: {
                arrayFormat: 'repeat',
            },
            headers,
            gzip: true,
            timeout: 10000, // max ms before request is aborted
            qs,
        };

        return wrappers.logsAndTimer(label, async () => {
            return requestPromise(requestParams);
        });
    }

    async function post(path, body, label, headers = { Accept: 'application/json' }, json = true, rejectUnauthorized = true) {
        const requestParams = {
            method: 'POST',
            uri: `${baseUrl}/${path}`,
            headers,
            gzip: true,
            timeout: 10000, // max ms before request is aborted
            json,
            body,
            rejectUnauthorized,
        };

        return wrappers.logsAndTimer(label, async () => {
            try {
                return await requestPromise(requestParams);
            } catch (err) {
                // err from requestPromise contains the original request options
                // which could include sensitive data in the body, so unset it
                // to prevent logging
                const newErr = { ...err }; // clone
                if (newErr.options.body) {
                    newErr.options.body = '_REDACTED_';
                }
                throw newErr;
            }
        });
    }

    return {
        get,
        post,
    };
};
