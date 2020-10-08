const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { ensureCorrectError, createMockGetDataset } = require('./utils/helpers');
const { createMockConvertSQL, createMockSQLCount, createMockSQLQueryPOST } = require('./utils/mock');
const { DEFAULT_RESPONSE_SQL_QUERY } = require('./utils/test-constants');

chai.should();

const requester = getTestServer();


nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query download tests', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Download from a dataset without connectorType document should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { connectorType: 'foo' });

        const requestBody = {
            loggedUser: null
        };

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/carto/download/${timestamp}?sql=${encodeURI(query)}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Download from a without a supported provider should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { provider: 'foo' });

        const requestBody = {
            loggedUser: null
        };

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/carto/download/${timestamp}?sql=${encodeURI(query)}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'cartodb\'');
    });

    it('Query without sql or fs parameter should return bad request', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp);

        const response = await requester
            .post(`/api/v1/carto/download/${timestamp}`)
            .send();

        ensureCorrectError(response, 'sql or fs required', 400);
    });

    it('Send query should return result with format json (happy case)', async () => {
        const timestamp = new Date().getTime();
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockGetDataset(timestamp);

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const response = await requester
            .post(`/api/v1/carto/download/${timestamp}`)
            .query({ sql, format: 'json' })
            .send();

        response.status.should.equal(200);
        response.headers['content-type'].should.equal('application/json');
        response.headers['content-disposition'].should.equal(`attachment; filename=${timestamp}.json`);
        response.body.should.deep.equal(DEFAULT_RESPONSE_SQL_QUERY.rows);
    });

    it('Send query should return result with format csv (happy case)', async () => {
        const timestamp = new Date().getTime();
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockGetDataset(timestamp);

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const response = await requester
            .post(`/api/v1/carto/download/${timestamp}`)
            .query({ sql, format: 'csv' })
            .send();

        response.status.should.equal(200);
        response.headers['content-type'].should.equal('text/csv');
        response.headers['content-disposition'].should.equal(`attachment; filename=${timestamp}.csv`);
        response.text.should.equal('"field1"\n123\n231\n');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
