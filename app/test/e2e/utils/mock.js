// eslint-disable-next-line import/no-extraneous-dependencies
const nock = require('nock');
const { DEFAULT_RESPONSE_SQL_QUERY } = require('./test-constants');

const createMockConvertSQL = (sqlQuery) => nock(process.env.CT_URL, { encodedQueryParams: true })
    .get(`/v1/convert/sql2SQL?sql=${encodeURIComponent(sqlQuery)}&experimental=true&raster=false`)
    .reply(200, {
        data: {
            type: 'result',
            id: 'undefined',
            attributes: {
                query: 'SELECT * FROM test',
                jsonSql: { select: [{ value: '*', alias: null, type: 'literal' }], from: 'test' }
            },
            relationships: {}
        }
    });

const createMockSQLQuery = (sqlQuery, connectorUrl) => nock(connectorUrl)
    .get(`/api/v2/sql?q=select%20*%20from%20wdpa_protected_areas%20limit%200`)
    .reply(200, DEFAULT_RESPONSE_SQL_QUERY);

const createMockSQLQueryPOST = (sqlQuery) => nock('https://test.carto.com')
    .post('/api/v2/sql', { q: sqlQuery })
    .reply(200, DEFAULT_RESPONSE_SQL_QUERY);

const createMockSQLCount = () => nock(`https://test.carto.com`)
    .post('/api/v2/sql')
    .reply(200, {
        rows: [{
            count: 2
        }]
    });

const createMockRegisterDataset = (id) => nock(process.env.CT_URL)
    .patch(`/v1/dataset/${id}`)
    .reply(200, {});

module.exports = {
    createMockConvertSQL,
    createMockSQLQuery,
    createMockSQLCount,
    createMockSQLQueryPOST,
    createMockRegisterDataset
};
