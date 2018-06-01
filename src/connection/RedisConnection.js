const util = require('util');
const redis = require('redis');

module.exports = (
    logger,
    host,
    port,
    dbIndex,
    enableInfoLogs = true,
) => {
    logger.info('redisconnector.init', {
        host,
        port,
        dbIndex,
    });

    const CONNECT_TIMEOUT_MS = 2000;
    let client = null;
    let infoLogsEnabled = enableInfoLogs;

    const RedisConnector = {
        client: () => {
            if (client) {
                return client;
            }

            client = redis.createClient(
                port,
                host,
                { connect_timeout: CONNECT_TIMEOUT_MS, db: dbIndex },
            );
            client.on('error', (err) => {
                logger.error(
                    'cache.error',
                    {
                        message: err.toString(),
                    },
                );
                client = null;
            });

            return client;
        },
    };

    // Call a Redis client function with args and return a Promise
    function proxyPromise(funcName, args) {
        const callArgs = Array.from(args);
        const func = util.promisify(RedisConnector.client()[funcName])
            .bind(RedisConnector.client());
        return func(...callArgs);
    }

    RedisConnector.disableLogs = () => {
        infoLogsEnabled = false;
    };

    RedisConnector.enableLogs = () => {
        infoLogsEnabled = true;
    };

    RedisConnector.get = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.get', { key });
        }
        return proxyPromise('get', args);
    };

    RedisConnector.mget = (...args) => {
        if (infoLogsEnabled) {
            const keys = Array.from(args);
            logger.info('cache.mget', { keys });
        }
        return proxyPromise('mget', args);
    };

    RedisConnector.set = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.set', { key });
        }
        return proxyPromise('set', args);
    };

    RedisConnector.delete = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.delete', { key });
        }
        return proxyPromise('del', args);
    };

    RedisConnector.lpush = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.lpush', { key });
        }
        return proxyPromise('lpush', args);
    };

    RedisConnector.rpush = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.rpush', { key });
        }
        return proxyPromise('rpush', args);
    };

    RedisConnector.lpop = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.lpop', { key });
        }
        return proxyPromise('lpop', args);
    };

    RedisConnector.rpop = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.rpop', { key });
        }
        return proxyPromise('rpop', args);
    };

    RedisConnector.blpop = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.blpop', { key });
        }
        return proxyPromise('blpop', args);
    };

    RedisConnector.brpop = (...args) => {
        if (infoLogsEnabled) {
            const key = args[0];
            logger.info('cache.brpop', { key });
        }
        return proxyPromise('brpop', args);
    };

    RedisConnector.publish = (...args) => {
        if (infoLogsEnabled) {
            const channel = args[0];
            logger.info('cache.publish', { channel });
        }
        return proxyPromise('publish', args);
    };

    RedisConnector.subscribe = (...args) => {
        if (infoLogsEnabled) {
            const channels = args;
            logger.info('cache.subscribe', { channels });
        }
        return proxyPromise('subscribe', args);
    };

    RedisConnector.listen = (event, callback) => {
        if (infoLogsEnabled) {
            logger.info('cache.listen', { event });
        }
        RedisConnector.client().on(event, callback);
    };

    RedisConnector.isHealthy = () => (
        new Promise((resolve, reject) => {
            RedisConnector.client().ping((err, response) => {
                if (err) {
                    logger.error('connector.RedisConnection.unhealthy', { message: err.message });
                    return reject(err);
                }

                if (!response && response.toUpperCase() !== 'PONG') {
                    logger.error('connector.RedisConnection.unhealthy', { message: 'Response obtained from Redis was invalid' });
                    return reject();
                }

                return resolve(true);
            });
        })
    );

    return RedisConnector;
};
