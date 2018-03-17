const ApiConnection = require('./src/connection/ApiConnection');
const DbConnection = require('./src/connection/DbConnection');
const RedisConnection = require('./src/connection/RedisConnection');

const JsonApiFetch = require('./src/source/JsonApiFetch');

module.exports = (logger, metrics, timers) => {
    const apiConnection = (host, port, protocol) =>
        ApiConnection(
            logger,
            metrics,
            timers,
            host,
            port,
            protocol,
        );

    const dbConnection = (host, port, username, password, dbName) =>
        DbConnection(
            logger,
            metrics,
            timers,
            host,
            port,
            username,
            password,
            dbName,
        );

    const redisConnection = (host, port, dbIndex) =>
        RedisConnection(
            logger,
            metrics,
            host,
            port,
            dbIndex,
        );

    const jsonApiFetch = (apiConn => JsonApiFetch(logger, metrics, apiConn));

    return {
        apiConnection,
        dbConnection,
        redisConnection,
        jsonApiFetch,
    };
};
