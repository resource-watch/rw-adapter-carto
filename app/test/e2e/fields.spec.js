const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockGetDataset } = require('./utils/helpers');

chai.should();

const requester = getTestServer();

const fields = [{
    field1: {
        type: 'number'
    },
    the_geom: {
        type: 'geometry'
    }
}];

describe('GET fields', () => {

    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting the fields for a dataset without connectorType document should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { connectorType: 'foo' });

        const requestBody = {
        };

        const response = await requester
            .post(`/api/v1/carto/fields/${timestamp}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Getting the fields for a dataset without a supported provider should fail', async () => {
        const timestamp = new Date().getTime();

        createMockGetDataset(timestamp, { provider: 'foo' });

        const requestBody = {
        };

        const response = await requester
            .post(`/api/v1/carto/fields/${timestamp}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'cartodb\'');
    });

    it('Get fields correctly for a carto dataset should return the field list (happy case)', async () => {
        const timestamp = new Date().getTime();

        const dataset = createMockGetDataset(timestamp);

        nock(`https://wri-01.carto.com`)
            .get(encodeURI(`/api/v2/sql?q=select * from ${dataset.attributes.tableName} limit 0`))
            .reply(200, {
                rows: [],
                fields
            });


        const response = await requester
            .post(`/api/v1/carto/fields/${dataset.id}`)
            .send({
            });

        response.status.should.equal(200);
        response.body.should.have.property('tableName');
        response.body.tableName.should.equal(dataset.attributes.tableName);
        response.body.should.have.property('fields');
        response.body.fields.should.deep.equal(fields);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
