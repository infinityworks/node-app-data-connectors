# node-app-data-connectors

Collection of libraries to interface with external data sources. At the moment, the following sources are supported:

- MySQL
- HTTP API
    - JSON REST API requests

## Installation

Add the following line to your `package.json` dependencies

```
"node-app-data-connectors": "git+ssh://git@bitbucket.org:infinityworksconsulting/node-app-data-connectors.git"
```

You can also install specific releases or git commits in this fashion. For the syntax to do that, check the [npm documentation](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies).

## Usage

Import the library and then initialise each individual connector with the desired parameters.

### Example

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
const jsonApiFetch = DataConnectors.jsonApiFetch(apiConnection);
```
