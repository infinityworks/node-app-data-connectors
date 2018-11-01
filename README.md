# node-app-data-connectors

[![Build Status](https://travis-ci.org/infinityworks/node-app-data-connectors.svg?branch=master)](https://travis-ci.org/infinityworks/node-app-data-connectors)

Collection of libraries to interface with external data sources. At the moment, the following sources are supported:

- MySQL
- HTTP API
  - JSON REST API requests
- Redis

## Installation

Add the following line to your `package.json` dependencies

```json
"node-app-data-connectors": "git+ssh://git@github.com:infinityworks/node-app-data-connectors.git[#<version>]"
```

You can also install specific releases or git commits in this fashion. For the syntax to do that, check the [npm documentation](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies).

## Configuration

Import the library and then initialise each individual connector with the desired parameters.

### Connector instantiation

Initialise the module by passing it some parameters inherited from node-app-base.

```js
const DataConnectors = require('node-app-data-connectors')(logger, timers, metrics);
```

#### DbConnection

Parameters:
- `host`: address of the MySQL server
- `port`: port to connect to the MySQL server on
- `user`: MySQL username
- `password`: MySQL password
- `database`: name of the database to query
- `connectionOptions`: options object to override default DB pool options
- `enableConnectionLogging`: log out connection lifecycle messages: creation, acquisition, release, queueing, etc.

```js
const dbConnection = DataConnectors.dbConnection(
    'sql.server',
    3306,
    'test',
    'testpassword',
    'db_name',
    { acquireTimeout: 1000 }
);
```

#### RedisConnection

Parameters:
- `host`: address of the Redis server
- `port`: port number to establish the Redis connection
- `dbIndex`: Redis database index
- `enableInfoLogs`: enable INFO level logs to be printed from the source

```js
const redisConnection = DataConnectors.redisConnection(
    'redis.host',
    6379,
    1
);
```

#### ApiConnection

Parameters:
- `host`: domain name of the host serving the API.
- `port`: port to establish the HTTP connection on, namely `80` or `443`.
- `protocol`: whether HTTP or HTTPS should be used. Accepted values are `http` or `https`.

```js
const apiConnection = DataConnectors.apiConnection(
    'service.api.com',
    443,
    'https'
);
const jsonApiFetch = DataConnectors.jsonApiFetch(apiConnection);
```

### Connector healthchecks

You can generate a healthcheck callback ready for consumption by the [node-app-base](https://github.com/infinityworks/node-app-base) healthcheck listener by invoking the `getHealthCheckCallback` function and passing an array containing all data sources that you want to monitor.

```js
const healthCheckCallback = DataConnectors.getHealthCheckCallback([dbConnection, redisConnection]);
healthCheck.initListener(healthCheckCallback());
```

## Usage

### DbConnection

MySQL database adapter.

#### query(sql, values = [], label)

Executes a single-statement prepared query with any number of positional parameters to substitute into the query.

Parameters:
- `sql`: string containing the SQL statement to run. Any query values to escape must be replaced by question marks.
- `values`: array of value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query

```javascript
let rows = [];
try {
    const params = [1];
    rows = await db.query(
        'SELECT * FROM `mytable` WHERE `id` = ?',
        params,
        'db.query',
    );
} catch (e) {
    // error
}
```

#### transactionQuery(sqls, values = [], label)

Executes any number of prepared statements using either positional or labelled parameters, within a single transaction that is automatically rolled back on failure.

Parameters:
- `sqls`: array of strings containing the SQL statements to run. Any query values to escape must be replaced by question marks.
- `values`: array of array of value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query

```javascript
let result = [];
try {
    const queries = [
        'UPDATE user SET password = ? WHERE id = ?',
        'INSERT INTO audit (type, date) VALUES ('passwordChange', NOW())',
    ];
    const values = [
        ['password123', '1337'],
        [],
    ];

    result = await db.transactionQuery(
        values,
        'db.query',
    );

    // result is an array of rows
} catch (e) {
    // error
}
```

#### queryStream(sql, values = [], label)

Executes a single-statement prepared query with any number of positional parameters to substitute into the query and returns
an array with a reference to the open channel with the database and a reference to the underlying connection. Calling `stream()` on the returned channel returns a `stream.Readable`.

Note: this function gives the caller ownership of the underlying connection, which means the connection must be closed by the caller manually when the operation is finished.

Parameters:
- `sql`: string containing the SQL statement to run. Any query values to escape must be replaced by question marks.
- `values`: array of value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query

Returns:
- `Array`
    - `EventEmitter`
    - Connection

```javascript
const params = [1];
const stream = await db.queryStream(
    'SELECT * FROM `mytable` WHERE `id` = ?',
    params,
    'db.query',
);

stream.on('error', (err) => {
    // handle error
})
.on('result', (row) => {
    // process data row
})
.on('end', () => {
    // all rows received
    // release the connection back into the pool
    connection.release();
});
```

#### multiStmtQuery(sql, values, label, options = {})

Executes any number of prepared statements using either positional or labelled parameters.

Parameters:
- `sql`: string containing the SQL statements to run. Any query values to escape must be replaced by question marks or colon-prefixed labels, depending on whether the `paramLabels` flag is set or not.
- `values`: array/object of value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query
- `options`
    - `paramLabels`: if set to `true`, will take a JavaScript object containing all the labelled parameters to inject into the statement (see `labelQuery` for an example). Default: `false` (will use positional parameters).

```javascript
const sql = 'SELECT * FROM `users` WHERE `id` = ?; SELECT * FROM `accounts` WHERE `user_id` = ?;'
let results = [];
try {
    const params = [1, 10];
    results = await db.multiStmtQuery(
        sql,
        params,
        'db.query',
    );
    const stmtOneRows = result[0];
    const stmtTwoRows = result[1];
} catch (e) {
    // error
}
```

#### labelQuery(sql, values = [], label)

Executes a single prepared statement using a number of labelled parameters, provided by a parameter object.

Parameters:
- `sql`: string containing the SQL statement to run. Any query values to escape must be prefixed with a colon and the name of the key as passed in the `values` object parameter.
- `values`: object of labelled value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query

```javascript
let rows = [];
try {
    const params = { id: 1, user_id: 20 };
    rows = await db.labelQuery(
        'SELECT * FROM `users` WHERE `id` = :id OR `user_id` = :user_id',
        params,
        'db.query',
    );
} catch (e) {
    // error
}
```

#### bulkInsert()

Executes a SQL INSERT statement with any number of value rows.

Parameters:
- `sql`: string containing the SQL INSERT statement to run. Any query values to escape must be replaced by question marks.
- `values`: array of value(s) to inject into the prepared statement.
- `label`: string containing the log key that will be used for this query

```javascript
let result = null;
try {
    const params = [['UserOne', 'UserOneSurname'], ['UserTwo', 'UserTwoSurname']];
    result = await db.bulkInsert(
        'INSERT INTO `users` (`firstname`, `surname`) VALUES ?',
        params,
        'db.query',
    );
} catch (e) {
    // error
}
```

### RedisConnection

The Redis adapter exposes the same public calls as the underlying Redis client. For a list of all supported Redis commands, see `RedisConnection.js`.

### ApiConnection

HTTP REST API client.

#### get(path[, qs, transactionId])

Send a HTTP request to a remote REST API endpoint.

Parameters:
- `path`: path section of the endpoint URI (without the URI scheme and domain name)
- `qs`: request query string object (for HTTP GET requests)
- `transactionId`: unique request identifier

```js
apiConnection.get('/v2/user/1', { token: 'sometoken' })
    .then((response) => {
        return response;
    })
    .catch((err) => {
        return Promise.reject(err);
    });
```

### JsonApiFetch

JSON wrapper around the generic `ApiConnection` adapter.

#### fetchFromJsonApi(apiPath[, qsObj, transactionId])

Parameters:
- `apiPath`: path section of the endpoint URI (without the URI scheme and domain name)
- `qsObj`: request query string object (for HTTP GET requests)
- `transactionId`: unique request identifier

```js
// Both Promise and ES7 async/await forms are supported
const response = await jsonApi.fetchFromJsonApi('/v2/user/1', { token: 'sometoken' });
return JSON.parse(response);
```
