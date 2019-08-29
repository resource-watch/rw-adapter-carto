/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./utils/test-server');
const { ensureCorrectError } = require('./utils/helpers');
const { createMockConvertSQL, createMockSQLCount, createMockSQLQueryPOST } = require('./utils/mock');
const { DATASET, DEFAULT_RESPONSE_SQL_QUERY } = require('./utils/test-constants');

const should = chai.should();

const query = createRequest('/api/v1/carto/query/', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query tests', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Query without sql or fs parameter should return bad request', async () => {
        const res = await query.post('123');
        ensureCorrectError(res, 'sql or fs required', 400);
    });

    it('Send query should return result(happy case)', async () => {
        const datasetID = '100010';
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const res = await query.post(datasetID).query({ sql }).send({ dataset: DATASET });
        res.status.should.equal(200);
        res.body.should.have.property('data').and.instanceOf(Array);
        res.body.should.have.property('meta').and.instanceOf(Object);

        const { meta, data } = res.body;
        data.should.deep.equal(DEFAULT_RESPONSE_SQL_QUERY.rows);

        meta.should.have.property('cloneUrl').and.instanceOf(Object);
        // eslint-disable-next-line camelcase
        const { cloneUrl: { http_method, url, body } } = meta;
        http_method.should.equal('POST');
        url.should.equal(`/dataset/${datasetID}/clone`);
        body.should.have.property('dataset').and.instanceOf(Object);

        const { datasetUrl, application } = body.dataset;
        application.should.deep.equal(['your', 'apps']);
        datasetUrl.should.equal(`/query/${datasetID}?sql=${encodeURI(sql).replace('*', '%2A')}`);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
