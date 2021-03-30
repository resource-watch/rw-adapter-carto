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

describe('Query tests - POST HTTP verb', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Query to dataset without connectorType cartodb should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { connectorType: 'foo' });

        const requestBody = {};

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/carto/query/${timestamp}?sql=${encodeURI(query)}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Query to dataset without a supported provider should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { provider: 'foo' });

        const requestBody = {};

        const query = `select * from ${timestamp}`;

        const response = await requester
            .post(`/api/v1/carto/query/${timestamp}?sql=${encodeURI(query)}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'cartodb\'');
    });

    it('Query without sql or fs parameter should return bad request', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp);

        const response = await requester
            .post(`/api/v1/carto/query/${timestamp}`)
            .send();

        ensureCorrectError(response, 'sql or fs required', 400);
    });

    it('Send query should return result(happy case)', async () => {
        const timestamp = new Date().getTime();
        const sql = 'SELECT * FROM test LIMIT 2 OFFSET 0';

        createMockGetDataset(timestamp);

        createMockSQLCount();
        createMockSQLQueryPOST(sql);
        createMockConvertSQL(sql);

        const response = await requester
            .post(`/api/v1/carto/query/${timestamp}`)
            .query({ sql })
            .send();


        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Array);
        response.body.should.have.property('meta').and.instanceOf(Object);

        const { meta, data } = response.body;
        data.should.deep.equal(DEFAULT_RESPONSE_SQL_QUERY.rows);

        meta.should.have.property('cloneUrl').and.instanceOf(Object);
        // eslint-disable-next-line camelcase
        const { cloneUrl: { http_method, url, body } } = meta;
        http_method.should.equal('POST');
        url.should.equal(`/dataset/${timestamp}/clone`);
        body.should.have.property('dataset').and.instanceOf(Object);

        const { datasetUrl, application } = body.dataset;
        application.should.deep.equal(['your', 'apps']);
        datasetUrl.should.equal(`/query/${timestamp}?sql=${encodeURI(sql).replace('*', '%2A')}`);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
