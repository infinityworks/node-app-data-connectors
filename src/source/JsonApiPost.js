const moment = require('moment');

module.exports = (logger, connection) => {
  async function postToJsonApi(apiPath, bodyObj, transactionId) {
    const startTime = moment();
    const request = connection.post( apiPath.replace(/^\/|\/$/g, ''), bodyObj, transactionId);

    return request
      .then(response => {
        const duration = moment().diff(startTime);

        logger.info('FetchFromRemote.postToJsonApi.response', {
          length: response.length,
          transactionId,
          duration
        });
        return response;
      })
      .catch(err => {

        logger.warn('FetchFromRemote.postToJsonApi.failed', {
          message: err,
          transactionId
        });

        return Promise.reject(err);
      });
  }

  return { postToJsonApi };
};
