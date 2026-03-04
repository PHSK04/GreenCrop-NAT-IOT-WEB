require('reflect-metadata');

const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { app: expressApp, HOST, PORT } = require('./server');

class AppModule {}
Module({})(AppModule);

async function bootstrap() {
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        {
            bodyParser: false,
            cors: false
        }
    );

    await app.listen(PORT, HOST);
    console.log(`NestJS wrapper is running on http://localhost:${PORT} (bound to ${HOST})`);
}

bootstrap().catch((err) => {
    console.error('Failed to start NestJS server:', err);
    process.exit(1);
});
