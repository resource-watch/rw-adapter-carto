const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockRegisterDataset, createMockSQLQuery, mockValidateRequestWithApiKey } = require('./utils/mock');
const { DATASET } = require('./utils/test-constants');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create Carto dataset tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Should create dataset', async () => {
        mockValidateRequestWithApiKey({});
        createMockSQLQuery('select * from test limit 2 offset 0', 'https://test.carto.com');
        createMockRegisterDataset(DATASET.data.id);

        const res = await requester
            .post('/api/v1/carto/rest-datasets/cartodb')
            .set('x-api-key', 'api-key-test')
            .send({
                connector: {
                    connectorUrl: DATASET.data.attributes.connectorUrl,
                    tableName: DATASET.data.attributes.table_name,
                    id: DATASET.data.id,
                }
            });

        res.status.should.equal(200);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
