const moment = require('moment');

module.exports = (logger, connection) => {
    async function fetchFromJsonApi(apiPath, qsObj, transactionId) {
        const startTime = moment();

        return connection.get(apiPath.replace(/^\/|\/$/g, ''), qsObj, transactionId)
            .then((response) => {
                const duration = moment().diff(startTime);

                logger.info(
                    'FetchFromRemote.fetchFromJsonApi.response',
                    {
                        length: response.length,
                        transactionId,
                        duration,
                    },
                );

                // check if response is falsy before trying to parse
                if (!response) {
                    logger.warn(
                        'FetchFromRemote.fetchFromJsonApi.failed',
                        { message: `invalid response from API ${response}`, transactionId },
                    );

                    return Promise.reject(new Error('invalid response from API'));
                }

                try {
                    return JSON.parse(response);
                } catch (e) {
                    logger.warn(
                        'FetchFromRemote.fetchFromJsonApi.failed',
                        { message: `unable to parse JSON response ${response}`, transactionId },
                    );
                    return Promise.reject(e);
                }
            })
            .catch((err) => {
                logger.warn(
                    'FetchFromRemote.fetchFromJsonApi.failed',
                    { message: err, transactionId },
                );
                return Promise.reject(err);
            });
    }

    return { fetchFromJsonApi };
};
