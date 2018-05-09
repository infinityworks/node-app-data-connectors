# node-app-data-connectors

[![Build Status](https://travis-ci.org/infinityworks/node-app-data-connectors.svg?branch=master)](https://travis-ci.org/infinityworks/node-app-data-connectors)

Collection of libraries to interface with external data sources. At the moment, the following sources are supported:

- MySQL
- HTTP API
    - JSON REST API requests
- Redis

## Installation

Add the following line to your `package.json` dependencies

```
"node-app-data-connectors": "git+ssh://git@github.com:infinityworks/node-app-data-connectors.git[#<version>]"
```

You can also install specific releases or git commits in this fashion. For the syntax to do that, check the [npm documentation](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies).

## Usage

Import the library and then initialise each individual connector with the desired parameters.

### Connector instantiation

```
const DataConnectors = require('node-app-data-connectors')(logger, metrics, timers);

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

You can generate a healthcheck callback ready for consumption by the node-app-base healthcheck listener by invoking the `getHealthCheckCallback` function and passing an array containing all data sources that you want to monitor.

```
const healthCheckCallback = DataConnectors.getHealthCheckCallback([dbConnection, redisConnection]);
healthCheck.initListener(healthCheckCallback());
```
