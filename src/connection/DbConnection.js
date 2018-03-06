/* eslint no-param-reassign: 1 */

const mysql = require('mysql');

module.exports = (
    logger,
    metrics,
    host,
    port,
    user,
    password,
    database,
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

        logger.info('connector.DBConnection.releaseConnection', {
            message: 'db connection dropped',
        });
    }

    function newConnection() {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    logger.error('connector.DBConnection.newConnection', err);
                    return reject(err);
                }

                logger.info('connector.DBConnection.newConnection', {
                    message: 'new db connection sourced from pool',
                });

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

    function query(sql, values = []) {
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.query(sql, values, (err, rows) => {
                        if (err) {
                            logger.error('connector.DBConnection.sql', err);
                            return reject(err);
                        }
                        releaseConnection(connection);
                        return resolve(rows);
                    });
                })
                .catch((err) => {
                    logger.error('connector.DBConnection.sql', err);
                    reject(err);
                });
        });
    }

    function multiStmtQuery(sql, values) {
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.config.queryFormat = bindParamLabels;
                    const queries = values.reduce((acc, row) => acc + connection.format(sql, row), '');
                    connection.query(queries, (err, rows) => {
                        if (err) {
                            logger.error('connector.DBConnection.multiStmtQuery', { message: err });
                            return reject(err);
                        }
                        releaseConnection(connection);
                        return resolve(rows);
                    });
                })
                .catch((err) => {
                    logger.error('connector.DBConnection.multiStmtQuery', { message: err });
                    reject(err);
                });
        });
    }

    // TODO -- Use transactions? connection.beginTransaction ...
    function bulkInsert(sql, values) {
        return new Promise((resolve, reject) => {
            newConnection()
                .then((connection) => {
                    connection.query(sql, [values], (err) => {
                        if (err) {
                            logger.error('connector.DbConnection.bulkInsert', err);
                            return reject(err);
                        }
                        releaseConnection(connection);
                        return resolve(true);
                    });
                })
                .catch((err) => {
                    logger.error('connector.DbConnection.bulkInsert', err);
                    reject(err);
                });
        });
    }

    return { query, multiStmtQuery, bulkInsert };
};
