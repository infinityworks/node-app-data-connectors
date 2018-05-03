/* eslint no-param-reassign: 1 */

const mysql = require('mysql2');

const DEFAULT_OUTPUT_LABEL = 'connector.DBConnection';
const QUEUE_LIMIT = 100;
const ACQUIRE_TIMEOUT = 1000;
const WAIT_FOR_CONNECTIONS = false;

module.exports = (
    logger,
    metrics,
    timers,
    host,
    port,
    user,
    password,
    database,
    connectionOptions = {},
    enableConnectionLogging = false,
) => {
    const poolOpts = Object.assign({
        host,
        user,
        password,
        database,
        queueLimit: QUEUE_LIMIT,
        acquireTimeout: ACQUIRE_TIMEOUT,
        waitForConnections: WAIT_FOR_CONNECTIONS,
    }, connectionOptions);

    const pool = mysql.createPool(poolOpts);

    logger.info('connector.DBConnection.init', {
        message: 'new db connection',
        host,
        port,
    });

    function releaseConnection(connection) {
        connection.release();

        if (enableConnectionLogging) {
            logger.info('connector.DBConnection.releaseConnection', {
                message: 'db connection dropped',
            });
        }
    }

    function newConnection() {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    logger.error('connector.DBConnection.newConnection', err);
                    return reject(err);
                }

                if (enableConnectionLogging) {
                    logger.info('connector.DBConnection.newConnection', {
                        message: 'new db connection sourced from pool',
                    });
                }

                return resolve(connection);
            });
        });
    }

    function bindParamLabels(sql, values) {
        if (!values || values.length === 0) {
            return sql;
        }

        return sql.replace(/:(\w+)/g, (txt, key) => {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                return mysql.escape(values[key]);
            }

            return txt;
        });
    }

    function query(sql, values = [], label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;
        return new Promise((resolve, reject) => {
            const startToken = timers.start();
            newConnection()
                .then((connection) => {
                    connection.query(sql, values, (err, rows) => {
                        const duration = timers.stop(startToken);
                        if (err) {
                            logger.error(`${outputLabel}.sql`, err);
                            connection.destroy();
                            return reject(err);
                        }
                        logger.info(`${outputLabel}.query.done`, {
                            duration,
                            count: rows.length,
                        });
                        releaseConnection(connection);
                        return resolve(rows);
                    });
                })
                .catch((err) => {
                    logger.error(`${outputLabel}.sql`, err);
                    reject(err);
                });
        });
    }

    function labelQuery(sql, values = [], label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;
        return new Promise((resolve, reject) => {
            const startToken = timers.start();
            newConnection()
                .then((connection) => {
                    connection.config.queryFormat = bindParamLabels;
                    const formattedSql = connection.format(sql, values);

                    connection.query(formattedSql, values, (err, rows) => {
                        const duration = timers.stop(startToken);
                        if (err) {
                            logger.error(`${outputLabel}.sql`, err);
                            return reject(err);
                        }
                        logger.info(`${outputLabel}.query.done`, {
                            duration,
                            count: rows.length,
                        });

                        // Since query format is set per connection and we have a pool of them,
                        // we might end up reusing this connection with this query format in a
                        // query that doesn't expect it.
                        connection.config.queryFormat = null;
                        releaseConnection(connection);
                        return resolve(rows);
                    });
                })
                .catch((err) => {
                    logger.error(`${outputLabel}.sql`, err);
                    reject(err);
                });
        });
    }

    function multiStmtQuery(sql, values, label) {
        if (poolOpts.multipleStatements !== true) {
            return Promise.reject(new Error('This pool has not been initialised with "multipleStatements: true" as an option'));
        }

        const outputLabel = label || DEFAULT_OUTPUT_LABEL;
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.config.queryFormat = bindParamLabels;
                    const queries = values.reduce((acc, row) => acc + connection.format(sql, row), '');
                    connection.query(queries, (err, rows) => {
                        if (err) {
                            logger.error(`${outputLabel}.multiStmtQuery`, { message: err });
                            return reject(err);
                        }

                        connection.config.queryFormat = null;
                        releaseConnection(connection);
                        if (!Array.isArray(rows)) {
                            rows = [rows];
                        }

                        return resolve(rows);
                    });
                })
                .catch((err) => {
                    logger.error(`${outputLabel}.multiStmtQuery`, { message: err });
                    reject(err);
                });
        });
    }

    // TODO -- Use transactions? connection.beginTransaction ...
    function bulkInsert(sql, values, label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.query(sql, [values], (err) => {
                        if (err) {
                            logger.error(`${outputLabel}.bulkInsert`, err);
                            return reject(err);
                        }
                        releaseConnection(connection);
                        return resolve(true);
                    });
                })
                .catch((err) => {
                    logger.error(`${outputLabel}.bulkInsert`, err);
                    reject(err);
                });
        });
    }

    function isHealthy() {
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.query('SELECT 1', null, (err, rows) => {
                        if (err) {
                            logger.error('connector.DBConnection.unhealthy');
                            return reject(err);
                        }
                        releaseConnection(connection);
                        return resolve(rows && rows.length > 0 && rows[0][1] === 1);
                    });
                })
                .catch((err) => {
                    logger.error('connector.DBConnection.unhealthy');
                    reject(err);
                });
        });
    }

    return {
        query,
        multiStmtQuery,
        labelQuery,
        bulkInsert,
        isHealthy,
    };
};
