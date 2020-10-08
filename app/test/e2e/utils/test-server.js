const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../../src/app');

let requester;

chai.use(chaiHttp);

const getTestServer = function getTestServer() {
    if (requester) {
        return requester;
    }

    nock(process.env.CT_URL)
        .post(`/api/v1/microservice`)
        .reply(200);

    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer };
