/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./utils/test-server');
const { createMockRegisterDataset, createMockSQLQuery } = require('./utils/mock');
const { DATASET } = require('./utils/test-constants');

const should = chai.should();

const registerDataset = createRequest('/api/v1/carto/rest-datasets/cartodb', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query register dataset tests', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Should register dataset', async () => {
        createMockSQLQuery('select * from test limit 2 offset 0', 'https://test.carto.com');
        createMockRegisterDataset(DATASET.data.id);
        const res = await registerDataset.post().send({
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
