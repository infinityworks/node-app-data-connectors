const requestPromise = require('request-promise');

module.exports = (logger, timers, host, port, protocol) => {
    function get(path, qs, transactionId) {
        const requestParams = {
            uri: `${protocol}://${host}:${port}/${path}`,
            qsStringifyOptions: {
                arrayFormat: 'repeat',
            },
            headers: {
                Accept: 'application/json',
            },
            gzip: true,
            timeout: 10000, // max ms before request is aborted
            qs,
        };

        const startToken = timers.start();

        return requestPromise(requestParams)
            .then((data) => {
                const duration = timers.stop(startToken);
                logger.info('lib.ApiConnection.query.done', {
                    duration,
                });
                return data;
            })
            .catch((err) => {
                logger.info('lib.ApiConnection.get', {
                    message: 'request failed',
                    uri: requestParams.uri,
                    err,
                    transactionId,
                });
                return Promise.reject(err);
            });
    }

    function post(path, body, transactionId) {
        const requestParams = {
            method: 'POST',
            uri: `${protocol}://${host}:${port}/${path}`,
            headers: {
                Accept: 'application/json',
            },
            gzip: true,
            timeout: 10000, // max ms before request is aborted
            json: true,
            body,
        };

        const startToken = timers.start();

        return requestPromise(requestParams)
            .then((data) => {
                const duration = timers.stop(startToken);
                logger.info('lib.ApiConnection.post.done', {
                    duration,
                });
                return data;
            })
            .catch((err) => {
                // err from requestPromise contains the original request options
                // which could include sensitive data in the body, so unset it
                // to prevent logging
                const newErr = { ...err }; // clone
                if (newErr.options.body) {
                    newErr.options.body = '_REDACTED_';
                }
                logger.info('lib.ApiConnection.post', {
                    message: 'request failed',
                    uri: requestParams.uri,
                    err: newErr,
                    transactionId,
                });
                return Promise.reject(newErr);
            });
    }
    return { get, post };
};
