import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { transports, format } from 'winston';
import 'winston-daily-rotate-file';
import { BlenderService, IBlenderInfo } from './components/blender/blender.service';
import { SocketIoClientProvider } from './components/socket/socket-io-client.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import path from 'path';
// const monitoro = require('monitoro');

// const express = require('express')
// import { Request, Response } from 'express'
// import { ExpressAdapter } from '@nestjs/platform-express';
import { QueueService } from './components/queue/queue.service';
import { IWorker, IWorkerInfo } from './components/worker/worker.service';
import { WorkerService } from './components/worker/worker.service';


// const monitoroQueues = [
//     {
//         "name": "render",
//         "hostId": "redis",
//         "url": "redis://localhost:6379"
//     }
// ]

async function bootstrap() {
    // const expressApp = express();
    // expressApp.locals.MonitoroQueues = monitoroQueues;
    // const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, {
        cors: true,
        logger: WinstonModule.createLogger({
            transports: [
                new transports.DailyRotateFile({
                    filename: `logs/%DATE%-error.log`,
                    level: 'error',
                    format: format.combine(format.timestamp(), format.json()),
                    datePattern: 'DD-MM-YYYY',
                    zippedArchive: false, // don't want to zip our logs
                    maxFiles: '10d', // will keep log until they are older than 30 days
                }),
                new transports.Console({
                    format: format.combine(
                        format.cli(),
                        format.splat(),
                        format.timestamp(),
                        format.printf((info) => {
                            return `${info.timestamp} ${info.level}: ${info.message}`;
                        }),
                    ),
                }),
            ],
        }),
    });
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }))
    const configService = app.get(ConfigService);
    const workerService = app.get(WorkerService);
    const blenderService = app.get(BlenderService);
    const socketIoClientProvider = app.get(SocketIoClientProvider);
    const port = configService.get('serverConf.port');
    let worker: IWorker = workerService.worker;
    let blenderInfo: IBlenderInfo = await blenderService.checkBlender();
    let workerInfo: IWorkerInfo = Object.assign(blenderInfo, worker);
    console.log(workerInfo);
    // console.log(socketIoClientProvider.getSocket().id);
    await socketIoClientProvider.initWorker(workerInfo);
    // const queueService = app.get(QueueService);
    // queueService.addJob('render', 'renderFile', { fileName: 'monkey.blend' });
    await app.listen(port);
    console.info(`Application is running on: ${await app.getUrl()}`);
    console.info(`Open Queues dashboard: ${await app.getUrl()}/dashboard`);
}
bootstrap();
