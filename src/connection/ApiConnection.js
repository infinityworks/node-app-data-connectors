const requestPromise = require('request-promise');

module.exports = (logger, metrics, host, port, protocol) => {
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

        return requestPromise(requestParams)
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

    return { get };
};
