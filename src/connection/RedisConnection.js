const redis = require('redis');

module.exports = (
    logger,
    host,
    port,
    dbIndex,
) => {
    logger.info('redisconnector.init', {
        host,
        port,
        dbIndex,
    });

    const CONNECT_TIMEOUT_MS = 2000;
    let client = null;

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

    RedisConnector.get = (key) => {
        logger.info('cache.get', {
            key,
        });

        return new Promise((resolve, reject) => {
            RedisConnector.client().get(key, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.mget = (...args) => {
        const keys = Array.from(args);
        logger.info('cache.mget', { keys });
        const localClient = RedisConnector.client();

        return new Promise((resolve, reject) => {
            keys.push((err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });

            localClient.mget(...keys);
        });
    };

    RedisConnector.set = (key, value) => {
        logger.info('cache.set', {
            key,
        });

        return new Promise((resolve, reject) => {
            RedisConnector.client().set(key, value, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.delete = (key) => {
        logger.info('cache.delete', { key });

        return new Promise((resolve, reject) => {
            RedisConnector.client().del(key, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.lpush = (key, values) => {
        logger.info('cache.lpush', { key, values });

        return new Promise((resolve, reject) => {
            RedisConnector.client().lpush(key, ...values, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.rpush = (key, values) => {
        logger.info('cache.rpush', { key, values });

        return new Promise((resolve, reject) => {
            RedisConnector.client().rpush(key, ...values, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.lpop = (key) => {
        logger.info('cache.lpop', { key });

        return new Promise((resolve, reject) => {
            RedisConnector.client().lpop(key, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.rpop = (key) => {
        logger.info('cache.rpop', { key });

        return new Promise((resolve, reject) => {
            RedisConnector.client().rpop(key, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.blpop = (key, timeout) => {
        logger.info('cache.blpop', { key });

        return new Promise((resolve, reject) => {
            RedisConnector.client().blpop(key, timeout, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.brpop = (key, timeout) => {
        logger.info('cache.brpop', { key });

        return new Promise((resolve, reject) => {
            RedisConnector.client().brpop(key, timeout, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
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
