module.exports = (logger, metrics) => {
    const sportsApiConnection = () => {
        require('./lib/ApiConnection')(logger, metrics, config.get('SPORTSAPI_HOST'), config.get('SPORTSAPI_PORT'), config.get('SPORTSAPI_PROTOCOL'));
    };
    const dbConnector = () => { 
        require('./lib/DbConnection')(
            logger,
            metrics,
            config.get('DB_HOST'),
            config.get('DB_PORT'),
            config.get('DB_USERNAME'),
            config.get('DB_PASSWORD'),
            config.get('DB_NAME'),
        );
    };
    const sportsApiFetcher = () => {
        require('./lib/source/jsonApiFetch')(logger, metrics, sportsApiConnection);
    };
};
