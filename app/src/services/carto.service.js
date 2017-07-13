const logger = require('logger');
const url = require('url');
const request = require('request');
const requestPromise = require('request-promise');
const simpleSqlParser = require('simple-sql-parser');

class CartoService {

    static async getFields(urlDataset, tableName) {
        logger.debug(`Obtaining fields of ${url} and table ${tableName}`);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', `https://${parsedUrl.host}/api/v2/sql?q=select * from ${tableName} limit 0`);
        try {
            const result = await requestPromise({
                method: 'GET',
                uri: `https://${parsedUrl.host}/api/v2/sql?q=select * from ${tableName} limit 0`,
                json: true
            });
            return result.fields;
        } catch (err) {
            logger.error('Error obtaining fields', err);
            throw new Error('Error obtaining fields');
        }
    }

    static async getCount(urlDataset, tableName, where) {
        logger.debug(`Obtaining count of ${urlDataset} and table ${tableName}`);
        const astTemp = simpleSqlParser.sql2ast(`select count(*) from ${tableName}`);
        if (where) {
            astTemp.WHERE = where;
        }
        const sql = simpleSqlParser.ast2sql(astTemp);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', unescape(`https://${parsedUrl.host}/api/v2/sql?q=${sql}`));
        try {
            const result = await requestPromise({
                method: 'POST',
                uri: `https://${parsedUrl.host}/api/v2/sql`,
                json: true,
                body: {
                    q: unescape(sql)
                }
            });
            return result.rows[0].count;
        } catch (err) {
            logger.error('Error obtaining count', err.message);
            throw err;
        }
    }

    static executeQuery(urlDataset, query, format) {
        logger.debug(`Doing query ${query} to ${urlDataset}`);
        const parsedUrl = url.parse(urlDataset);
        logger.debug('Doing request to ', `https://${parsedUrl.host}/api/v2/sql?q=${query}`);
        const configRequest = {
            uri: `https://${parsedUrl.host}/api/v2/sql`,
            method: 'POST',
            json: true,
            body: {
                q: unescape(query)
            }
        };
        if (format && format === 'geojson') {
            configRequest.body.format = 'geojson';
        }
        return request(configRequest);
    }

}

module.exports = CartoService;
