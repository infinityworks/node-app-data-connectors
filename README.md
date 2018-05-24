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

```js
const DataConnectors = require('node-app-data-connectors')(logger, timers, metrics);

const apiConnection = DataConnectors.apiConnection(
    config.get('SPORTSAPI_HOST'),
    config.get('SPORTSAPI_PORT'),
    config.get('SPORTSAPI_PROTOCOL')
);
const dbConnection = DataConnectors.dbConnection(
    config.get('DB_HOST'),
    config.get('DB_PORT'),
    config.get('DB_USERNAME'),
    config.get('DB_PASSWORD'),
    config.get('DB_NAME'),
);
const redisConnection = DataConnectors.redisConnection(
    config.get('REDIS_HOST'),
    config.get('REDIS_PORT'),
    config.get('REDIS_DB_INDEX'),
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

