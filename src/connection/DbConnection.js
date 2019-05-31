/* eslint no-param-reassign: 1 */

const mysql = require('mysql2');

const DEFAULT_OUTPUT_LABEL = 'connector.DBConnection';
// These flags are expected to be reasonably stable for any service
// but are mainly performance-driven, so as to prevent connections from backing up
// and services becoming silently overwhelmed and unresponsive.
// Further documentation on these flags can be found at https://github.com/mysqljs/mysql#pool-options
//
// Connection pool size, i.e. number of connections that can be ready in the pool
// They're lazily loaded
const CONNECTION_LIMIT = 200;

// If set to `true`, the driver will queue up any newly requested connections if the amount
// exceeds the current connection limit.
// If `false`, the driver will immediately error out when it runs out of connections. This is to
// prevent a backlog of connection requests from silently backing up.
const WAIT_FOR_CONNECTIONS = false;

// Only applicable if `waitForConnections` is true
// Maximum amount of requests to push into the queue awaiting a connection from the pool
const QUEUE_LIMIT = 100;

module.exports = (
    wrappers,
    logger,
    metrics,
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
        port,
        user,
        password,
        database,
        connectionLimit: CONNECTION_LIMIT,
        queueLimit: QUEUE_LIMIT,
        waitForConnections: WAIT_FOR_CONNECTIONS,
    }, connectionOptions);

    const pool = mysql.createPool(poolOpts);
    let poolSize = 0;
    let acquiredConnections = 0;

    function exportAcquiredConnectionsMetric(value) {
        metrics.gauge({
            name: 'connector_db_acquired_conns',
            help: 'Number of connections currently acquired from the pool',
            value,
        });
    }

    pool.on('acquire', () => {
        acquiredConnections += 1;
        exportAcquiredConnectionsMetric(acquiredConnections);

        if (enableConnectionLogging) {
            logger.info('connector.DBConnection.acquire', { acquiredConnections });
        }
    });

    pool.on('connection', () => {
        poolSize += 1;
        metrics.gauge({
            name: 'connector_db_pool_size',
            help: 'Current size of the DB connection pool',
            value: poolSize,
        });

        if (enableConnectionLogging) {
            logger.info('connector.DBConnection.connection', { poolSize });
        }
    });

    pool.on('enqueue', () => {
        if (enableConnectionLogging) {
            logger.info('connector.DBConnection.enqueue');
        }
    });

    pool.on('release', () => {
        acquiredConnections -= 1;
        exportAcquiredConnectionsMetric(acquiredConnections);

        if (enableConnectionLogging) {
            logger.info('connector.DBConnection.release', { acquiredConnections });
        }
    });

    logger.info('connector.DBConnection.init', {
        message: 'new db pool created',
        host,
        port,
        connectionLimit: poolOpts.connectionLimit,
        queueLimit: poolOpts.queueLimit,
        acquireTimeout: poolOpts.acquireTimeout,
        waitForConnections: poolOpts.waitForConnections,
    });

    function getMetaInfo(connection) {
        return result => ({
            connectionId: connection.threadId || 'pool',
            count: result.length,
        });
    }

    async function newConnection(outputLabel) {
        try {
            return await pool.getConnection();
        } catch (err) {
            logger.error('connector.DBConnection.newConnection', err);
            if (outputLabel) {
                logger.error(`${outputLabel}.connectionFailure`, err);
            }
            throw err;
        }
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

    async function queryWithConnection(connection, sql, values = [], label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;

        return wrappers.logsAndTimer(
            outputLabel,
            async () => {
                const [rows] = await connection.promise().execute(sql, values);
                return rows;
            },
            getMetaInfo(connection),
        );
    }

    async function query(sql, values = [], label) {
        return queryWithConnection(pool, sql, values, label);
    }
    async function withinConnection(callback, label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;

        return wrappers.logsAndTimer(
            outputLabel,
            async () => {
                const connection = await newConnection(outputLabel);

                try {
                    const results = await callback(connection);
                    connection.release();
                    return results;
                } catch (err) {
                    connection.destroy();
                    throw err;
                }
            },
        );
    }

    async function withinTransaction(callback, label) {
        const outputLabel = label || DEFAULT_OUTPUT_LABEL;
        return withinConnection(async (connection) => {
            await queryWithConnection(connection, 'BEGIN TRANSACTION', [], `${outputLabel}.beginTransaction`);

            try {
                const results = await callback(connection);
                await queryWithConnection(connection, 'COMMIT', [], `${outputLabel}.commit`);
                return results;
            } catch (err) {
                await queryWithConnection(connection, 'ROLLBACK', [], `${outputLabel}.rollback`);
                throw err;
            }
        }, outputLabel);
    }

    async function labelQuery(sql, values = [], label) {
        return withinConnection(async (connection) => {
            connection.config.queryFormat = bindParamLabels;
            const formattedSql = connection.format(sql, values);

            const rows = await queryWithConnection(connection, formattedSql, values);

            connection.config.queryFormat = null;

            return rows;
        }, label);
    }

    async function isHealthy() {
        try {
            const rows = await pool.promise()
                .query('SELECT 1', null);

            if (!rows || rows.length === 0 || rows[0][1] !== 1) {
                throw new Error('Response obtained from database was invalid');
            }

            return true;
        } catch (err) {
            logger.error(`${DEFAULT_OUTPUT_LABEL}.unhealthy`, { message: err.message });
            throw err;
        }
    }

    return {
        query,
        queryWithConnection,
        withinConnection,
        withinTransaction,
        labelQuery,
        isHealthy,
        escape: mysql.escape,
        escapeId: mysql.escapeId,
    };
};
