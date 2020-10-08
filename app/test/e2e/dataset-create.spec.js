const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockRegisterDataset, createMockSQLQuery } = require('./utils/mock');
const { DATASET } = require('./utils/test-constants');

chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create Carto dataset tests', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Should create dataset', async () => {
        createMockSQLQuery('select * from test limit 2 offset 0', 'https://test.carto.com');
        createMockRegisterDataset(DATASET.data.id);

        const res = await requester
            .post('/api/v1/carto/rest-datasets/cartodb')
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
