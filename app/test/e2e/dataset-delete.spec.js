const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { mockValidateRequestWithApiKey } = require('./utils/mock');

chai.should();

let requester;

describe('Delete Carto dataset', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting a carto dataset does nothing and returns a 200 status code', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .delete(`/api/v1/carto/rest-datasets/cartodb/12345`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
