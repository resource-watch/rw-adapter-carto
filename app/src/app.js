const Koa = require('koa');
const logger = require('logger');
const koaLogger = require('koa-logger');
const config = require('config');
const loader = require('loader');
const convert = require('koa-convert');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const ErrorSerializer = require('serializers/error.serializer');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const koaBody = require('koa-body')({
    multipart: true,
    jsonLimit: '50mb',
    formLimit: '50mb',
    textLimit: '50mb'
});

const app = new Koa();

app.use(convert(koaBody));

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        let error = err;
        try {
            error = JSON.parse(err);
        } catch (e) {
            logger.error(`Error parsing exception: ${err.message}`);
        }
        ctx.status = err.status || 500;
        if (ctx.status >= 500) {
            logger.error(err);
        } else {
            logger.info(err);
        }
        ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
        if (process.env.NODE_ENV === 'prod' && this.status === 500) {
            ctx.body = 'Unexpected error';
        }
        ctx.response.type = 'application/vnd.api+json';
    }

});

app.use(koaLogger());
app.use(koaSimpleHealthCheck());

app.use(RWAPIMicroservice.bootstrap({
    logger,
    gatewayURL: process.env.GATEWAY_URL,
    microserviceToken: process.env.MICROSERVICE_TOKEN,
    fastlyEnabled: process.env.FASTLY_ENABLED,
    fastlyServiceId: process.env.FASTLY_SERVICEID,
    fastlyAPIKey: process.env.FASTLY_APIKEY,
    requireAPIKey: process.env.REQUIRE_API_KEY || true,
    awsRegion: process.env.AWS_REGION,
    awsCloudWatchLogStreamName: config.get('service.name'),
}));

loader.loadRoutes(app);

const instance = app.listen(process.env.PORT, () => {
    if (process.env.CT_REGISTER_MODE === 'auto') {
        RWAPIMicroservice.register().then(() => {
            logger.info('CT registration process started');
        }, (error) => {
            logger.error(error);
            process.exit(1);
        });
    }
});
logger.info('Server started in ', process.env.PORT);

module.exports = instance;
