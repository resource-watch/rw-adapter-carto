const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./test-server');

const should = chai.should();

const requester = getTestServer();

const dataset = {
    data: {
        id: '00c47f6d-13e6-4a45-8690-897bdaa2c723',
        attributes: {
            connectorUrl: 'https://wri-01.carto.com/tables/wdpa_protected_areas/table',
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

describe('E2E test', () => {
    before(() => {
        nock(`https://wri-01.carto.com`)
            .get(encodeURI(`/api/v2/sql?q=select * from ${dataset.data.attributes.table_name} limit 0`))
            .reply(200, {
                rows: [],
                fields
            });
        nock(`${process.env.CT_URL}`)
            .get(encodeURI(`/convert/sql2SQL?sql=update table`))
            .reply(400, {
                status: 400,
                detail: 'Malformed query'
            });
    });

    it('Get fields correctly', async () => {
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

    after(() => {
    });
});
