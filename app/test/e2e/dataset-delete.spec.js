const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./test-server');

const should = chai.should();

const requester = getTestServer();

describe('E2E test', () => {

    it('Get fields correctly', async () => {
        const response = await requester
            .delete(`/api/v1/carto/rest-datasets/cartodb`)
            .send({});

        response.status.should.equal(200);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
