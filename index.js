const ApiConnection = require('./src/connection/ApiConnection');
const DbConnection = require('./src/connection/DbConnection');
const RedisConnection = require('./src/connection/RedisConnection');

const JsonApiFetch = require('./src/source/JsonApiFetch');

module.exports = (logger, timers) => {
    const apiConnection = (host, port, protocol) =>
        ApiConnection(
            logger,
            timers,
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
            logger,
            timers,
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
        getHealthCheckCallback,
    };
};
