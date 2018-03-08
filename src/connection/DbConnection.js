/* eslint no-param-reassign: 1 */

const mysql = require('mysql');

const DEFAULT_OUTPUT_LABEL = 'connector.DBConnection';

module.exports = (
    logger,
    metrics,
    timers,
    host,
    port,
    user,
    password,
    database,
    logConnections = false,
) => {
    const pool = mysql.createPool({
        host,
        user,
        password,
        database,
        multipleStatements: true,
    });

    logger.info('connector.DBConnection.init', {
        message: 'new db connection',
        host,
        port,
    });

    function releaseConnection(connection) {
        connection.release();

        if (logConnections) {
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

                if (logConnections) {
                    logger.info('connector.DBConnection.newConnection', {
                        message: 'new db connection sourced from pool',
                    });
                }

                return resolve(connection);
            });
        });
    }

    function bindParamLabels(sql, values) {
        if (!values) {
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

    function multiStmtQuery(sql, values, label) {
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
                        releaseConnection(connection);
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

    return { query, multiStmtQuery, bulkInsert };
};
