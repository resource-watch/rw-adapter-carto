const DATASET = {
    data: {
        id: '00c47f6d-13e6-4a45-8690-897bdaa2c723',
        attributes: {
            connectorUrl: 'https://test.carto.com/tables/wdpa_protected_areas/table',
            table_name: 'wdpa_protected_areas'
        }
    }
};

const DEFAULT_RESPONSE_SQL_QUERY = {
    rows: [
        { field1: 123 },
        { field1: 231 },
    ],
    fields: {
        field1: {
            type: 'number'
        },
    }
};

module.exports = { DATASET, DEFAULT_RESPONSE_SQL_QUERY };
