// eslint-disable-next-line import/no-extraneous-dependencies
const nock = require('nock');
const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const config = require('config');
const { DEFAULT_RESPONSE_SQL_QUERY } = require('./test-constants');

const createMockConvertSQL = (sqlQuery) => nock(process.env.GATEWAY_URL, {
    reqheaders: {
        'x-api-key': 'api-key-test',
    }
})
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

const createMockSQLQueryPOST = (sqlQuery) => nock('https://wri-01.carto.com')
    .post('/api/v2/sql', { q: sqlQuery })
    .reply(200, DEFAULT_RESPONSE_SQL_QUERY);

const createMockSQLCount = () => nock(`https://wri-01.carto.com`)
    .post('/api/v2/sql')
    .reply(200, {
        rows: [{
            count: 2
        }]
    });

const createMockRegisterDataset = (id) => nock(process.env.GATEWAY_URL, {
    reqheaders: {
        'x-api-key': 'api-key-test',
    }
})
    .patch(`/v1/dataset/${id}`)
    .reply(200, {});

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

module.exports = {
    mockValidateRequestWithApiKey,
    createMockConvertSQL,
    createMockSQLQuery,
    createMockSQLCount,
    createMockSQLQueryPOST,
    createMockRegisterDataset
};
