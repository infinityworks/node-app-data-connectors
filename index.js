const ApiConnection = require('./src/connection/ApiConnection');
const DbConnection = require('./src/connection/DbConnection');
const RedisConnection = require('./src/connection/RedisConnection');

const JsonApiFetch = require('./src/source/JsonApiFetch');
const JsonApiPost = require('./src/source/JsonApiPost');

module.exports = (logger, metrics, wrappers) => {
    const apiConnection = (host, port, protocol) =>
        ApiConnection(
            wrappers,
            host,
            port,
            protocol,
        );

    const dbConnection = (
        host,
        port,
        username,
        password,
        dbName,
        connectionOptions,
        enableConnectionLogging,
    ) =>
        DbConnection(
            wrappers,
            logger,
            metrics,
            host,
            port,
            username,
            password,
            dbName,
            connectionOptions,
            enableConnectionLogging,
        );

    const redisConnection = (host, port, dbIndex) =>
        RedisConnection(
            logger,
            host,
            port,
            dbIndex,
        );

    const jsonApiFetch = (apiConn => JsonApiFetch(logger, apiConn));

    const jsonApiPost = (apiConn => JsonApiPost(logger, apiConn));

    function getHealthCheckCallback(sources = []) {
        return () => (
            async () => {
                if (!sources || sources.length === 0) {
                    logger.error('data.healthcheck', 'No data sources provided');
                    throw new Error('No data sources passed');
                }

                const sourcesHealthchecks = await (Promise.all(sources.map(async (source) => {
                    try {
                        return source.isHealthy();
                    } catch (e) {
                        if (e instanceof TypeError) {
                            logger.error('data.healthcheck', { message: 'Data source does not implement healthcheck function' });
                        }

                        return false;
                    }
                })));

                if (sourcesHealthchecks.some(r => !r)) {
                    throw new Error();
                }

                return true;
            }
        );
    }

    return {
        apiConnection,
        dbConnection,
        redisConnection,
        jsonApiFetch,
        jsonApiPost,
        getHealthCheckCallback,
    };
};
