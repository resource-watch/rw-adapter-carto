const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');

chai.should();

const requester = getTestServer();

const dataset = {
    data: {
        id: '00c47f6d-13e6-4a45-8690-897bdaa2c723',
        attributes: {
            connectorUrl: 'https://test.carto.com/tables/wdpa_protected_areas/table',
            table_name: 'wdpa_protected_areas'
        }
    }
};

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

    it('Get fields correctly for a carto dataset should return the field list (happy case)', async () => {
        nock(`https://test.carto.com`)
            .get(encodeURI(`/api/v2/sql?q=select * from ${dataset.data.attributes.table_name} limit 0`))
            .reply(200, {
                rows: [],
                fields
            });


        const response = await requester
            .post(`/api/v1/carto/fields/${dataset.data.id}`)
            .send({
                dataset,
                loggedUser: null
            });

        response.status.should.equal(200);
        response.body.should.have.property('tableName');
        response.body.tableName.should.equal(dataset.data.attributes.table_name);
        response.body.should.have.property('fields');
        response.body.fields.should.deep.equal(fields);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
