import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { transports, format } from 'winston';
import 'winston-daily-rotate-file';
import { BlenderService } from './components/blender/blender.service';
import { SocketIoClientProvider } from './socket/socket-io-client.service';
import { IBlenderInfo } from '../dist/components/blender/blender.service';

async function bootstrap() {
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
    app.setGlobalPrefix('api');
    const blenderService = app.get(BlenderService);
    let blenderInfo: IBlenderInfo = await blenderService.checkBlender()
    const socketIoClientProvider = app.get(SocketIoClientProvider);
    console.log(socketIoClientProvider.getSocket().id)
    socketIoClientProvider.sendBlenderInfo(blenderInfo);
    const configService = app.get(ConfigService);
    const port = configService.get('serverConf.port');
    await app.listen(port);
    console.info(`Application is running on: ${await app.getUrl()}/api`);
}
bootstrap();
