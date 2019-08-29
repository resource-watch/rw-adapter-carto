/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./utils/test-server');
const { ensureCorrectError } = require('./utils/helpers');
const { createMockConvertSQL, createMockSQLCount, createMockSQLQueryPOST } = require('./utils/mock');
const { DATASET, DEFAULT_RESPONSE_SQL_QUERY } = require('./utils/test-constants');

const should = chai.should();

const query = createRequest('/api/v1/carto/download/', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query download tests', () => {
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

    it('Send query should return result with format json (happy case)', async () => {
        const datasetID = '100010';
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const res = await query.post(datasetID).query({ sql, format: 'json' }).send({ dataset: DATASET });
        res.headers['content-type'].should.equal('application/json');
        res.headers['content-disposition'].should.equal(`attachment; filename=${DATASET.data.id}.json`);
        res.status.should.equal(200);
        res.body.should.deep.equal(DEFAULT_RESPONSE_SQL_QUERY.rows);
    });

    it('Send query should return result with format csv (happy case)', async () => {
        const datasetID = '100010';
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const res = await query.post(datasetID).query({ sql, format: 'csv' }).send({ dataset: DATASET });
        res.headers['content-type'].should.equal('text/csv');
        res.headers['content-disposition'].should.equal(`attachment; filename=${DATASET.data.id}.csv`);
        res.status.should.equal(200);
        res.text.should.equal('"field1"\n123\n231\n');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
