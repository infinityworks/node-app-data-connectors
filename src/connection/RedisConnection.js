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

    RedisConnector.disableLogs = () => {
        infoLogsEnabled = false;
    };

    RedisConnector.enableLogs = () => {
        infoLogsEnabled = true;
    };

    RedisConnector.get = (key) => {
        if (infoLogsEnabled) {
            logger.info('cache.get', {
                key,
            });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.mget', { keys });
        }
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
        if (infoLogsEnabled) {
            logger.info('cache.set', {
                key,
            });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.delete', { key });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.lpush', { key });
        }

        const vals = !Array.isArray(values) ? [values] : values;
        return new Promise((resolve, reject) => {
            RedisConnector.client().lpush(key, ...vals, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.rpush = (key, values) => {
        if (infoLogsEnabled) {
            logger.info('cache.rpush', { key });
        }

        const vals = !Array.isArray(values) ? [values] : values;
        return new Promise((resolve, reject) => {
            RedisConnector.client().rpush(key, ...vals, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.lpop = (key) => {
        if (infoLogsEnabled) {
            logger.info('cache.lpop', { key });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.rpop', { key });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.blpop', { key });
        }

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
        if (infoLogsEnabled) {
            logger.info('cache.brpop', { key });
        }

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

    RedisConnector.publish = (channel, value) => {
        if (infoLogsEnabled) {
            logger.info('cache.publish', { channel });
        }

        return new Promise((resolve, reject) => {
            RedisConnector.client().publish(channel, value, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };

    RedisConnector.subscribe = (channels) => {
        if (infoLogsEnabled) {
            logger.info('cache.subscribe', { channels });
        }

        RedisConnector.client().subscribe(...channels, (err) => {
            if (err) {
                logger.warn('cache.subscribe.fail', { message: `Failed to subscribe to channels: ${channels}` });
            }
        });
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
