const chai = require('chai');
const chaiHttp = require('chai-http');
const config = require('config');
const { mockCloudWatchSetupRequestsSequence } = require('rw-api-microservice-node/dist/test-mocks');
const server = require('../../../src/app');

let requester;

chai.use(chaiHttp);

const getTestServer = function getTestServer() {
    if (requester) {
        return requester;
    }

    mockCloudWatchSetupRequestsSequence({
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });

    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer };
