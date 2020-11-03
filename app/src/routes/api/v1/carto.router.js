const Router = require('koa-router');
const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const CartoService = require('services/carto.service');
const QueryService = require('services/query.service');
const FieldSerializer = require('serializers/field.serializer');
const passThrough = require('stream').PassThrough;
const ErrorSerializer = require('serializers/error.serializer');
const DatasetMiddleware = require('middleware/dataset.middleware');

const router = new Router({
    prefix: '/carto',
});

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');


class CartoRouter {

    static getCloneUrl(url, idDataset) {
        return {
            http_method: 'POST',
            url: `/dataset/${idDataset}/clone`,
            body: {
                dataset: {
                    datasetUrl: url.replace('/carto', ''),
                    application: ['your', 'apps']
                }
            }
        };
    }

    static async query(ctx) {
        ctx.set('Content-type', 'application/json');
        const { format } = ctx.query;
        const cloneUrl = CartoRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
        try {
            ctx.body = passThrough();
            const queryService = await new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, false, format, ctx.state.jsonSql);
            await queryService.init();
            queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            logger.error(err);
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async download(ctx) {
        try {
            ctx.body = passThrough();
            const format = ctx.query.format ? ctx.query.format : 'csv';
            let mimetype;
            switch (format) {

                case 'csv':
                    mimetype = 'text/csv';
                    break;
                case 'json':
                default:
                    mimetype = 'application/json';
                    break;

            }

            const cloneUrl = CartoRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
            const queryService = await new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, true, format, ctx.state.jsonSql);
            await queryService.init();
            ctx.set('Content-disposition', `attachment; filename=${ctx.request.body.dataset.id}.${format}`);
            ctx.set('Content-type', mimetype);

            queryService.execute();
            logger.debug('Finished query');
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async fields(ctx) {
        logger.info('Obtaining fields');
        const fields = await CartoService.getFields(ctx.request.body.dataset.connectorUrl, ctx.request.body.dataset.tableName);
        ctx.body = FieldSerializer.serialize(fields, ctx.request.body.dataset.tableName);
    }

    static async registerDataset(ctx) {
        logger.info('Registering dataset with data', ctx.request.body);
        try {
            await CartoService.getFields(ctx.request.body.connector.connectorUrl, ctx.request.body.connector.tableName);
            await ctRegisterMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 1
                    }
                },
                json: true
            });
        } catch (e) {
            await ctRegisterMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 2,
                        errorMessage: `${e.name} - ${e.message}`
                    }
                },
                json: true
            });
        }
        ctx.body = {};
    }

    static async deleteDataset(ctx) {
        logger.info('Delete carto dataset stub');
        ctx.body = {};
    }

}

const sanitizeUrl = async (ctx, next) => {
    if (ctx.request.body.dataset && ctx.request.body.dataset.connectorUrl && /\/u\//.test(ctx.request.body.dataset.connectorUrl)) {
        const user = ctx.request.body.dataset.connectorUrl.split(/\/u|\/table/)[1].replace('/', '');
        ctx.request.body.dataset.connectorUrl = `https://${user}.carto.com/api/v2/sql`;
    } else if (ctx.request.body.connector && ctx.request.body.connector.connector_url && /\/u\//.test(ctx.request.body.connector.connector_url)) {
        const user = ctx.request.body.connector.connector_url.split(/\/u|\/table/)[1].replace('/', '');
        ctx.request.body.connector.connector_url = `https://${user}.carto.com/api/v2/sql`;
    }
    await next();
};


const toSQLMiddleware = async (ctx, next) => {
    const options = {
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
    };
    if (!ctx.query.sql && !ctx.request.body.sql && !ctx.query.outFields && !ctx.query.outStatistics) {
        ctx.throw(400, 'sql or fs required');
        return;
    }

    if (ctx.query.sql || ctx.request.body.sql) {
        logger.debug('Checking sql correct');
        const params = { ...ctx.query, ...ctx.request.body };
        options.uri = `/convert/sql2SQL?sql=${encodeURIComponent(params.sql)}&experimental=true&raster=${ctx.request.body.dataset.type === 'raster'}`;
        if (params.geostore) {
            options.uri += `&geostore=${params.geostore}`;
        }
        if (params.geojson) {
            options.body = {
                geojson: params.geojson
            };
            options.method = 'POST';
        }
    } else {
        logger.debug('Obtaining sql from featureService');
        const fs = { ...ctx.request.body };
        delete fs.dataset;
        const query = serializeObjToQuery(ctx.request.query);
        const body = fs;
        const resultQuery = { ...query };

        if (resultQuery) {
            options.uri = `/convert/fs2SQL${resultQuery}&tableName=${ctx.request.body.dataset.tableName}`;
        } else {
            options.uri = `/convert/fs2SQL?tableName=${ctx.request.body.dataset.tableName}`;
        }
        options.body = body;
        options.method = 'POST';
    }

    try {
        const result = await ctRegisterMicroservice.requestToMicroservice(options);
        logger.debug('result', result.statusCode);
        if (result.statusCode === 204 || result.statusCode === 200) {
            ctx.query.sql = result.body.data.attributes.query;
            ctx.state.jsonSql = result.body.data.attributes.jsonSql;
            await next();
        } else if (result.statusCode === 400) {
            ctx.status = result.statusCode;
            ctx.body = result.body;
        } else {
            ctx.throw(result.statusCode, result.body);
        }

    } catch (e) {
        if (e.errors && e.errors.length > 0 && e.errors[0].status >= 400 && e.errors[0].status < 500) {
            ctx.status = e.errors[0].status;
            ctx.body = e;
        } else {
            throw e;
        }
    }
};

router.post('/query/:dataset', DatasetMiddleware.getDatasetById, toSQLMiddleware, sanitizeUrl, CartoRouter.query);
router.post('/download/:dataset', DatasetMiddleware.getDatasetById, toSQLMiddleware, sanitizeUrl, CartoRouter.download);
router.post('/fields/:dataset', DatasetMiddleware.getDatasetById, sanitizeUrl, CartoRouter.fields);
router.post('/rest-datasets/cartodb', sanitizeUrl, CartoRouter.registerDataset);
router.delete('/rest-datasets/cartodb/:dataset', CartoRouter.deleteDataset);

module.exports = router;
