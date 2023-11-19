import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import serverConfig from './config/server.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlenderService } from './components/blender/blender.service';
import { BlenderModule } from './components/blender/blender.module';
import blenderConfig from './config/blender.config.';
import { SocketIoClientProvider } from './components/socket/socket-io-client.service';
import workerConfig from './config/worker.config';
import { QueueModule } from './components/queue/queue.module';
import { BullModule } from '@nestjs/bull';
import redisConfig from './config/redis.config';
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { WorkerService } from './components/worker/worker.service';
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: `${process.cwd()}/.env`,
            load: [serverConfig, blenderConfig, workerConfig, redisConfig],
            isGlobal: true,
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('redisConf.host'),
                    port: +configService.get('redisConf.port')
                },
            }),
            inject: [ConfigService],
        }),
        BullBoardModule.forRoot({
            route: '/dashboard',
            adapter: ExpressAdapter // Or FastifyAdapter from `@bull-board/fastify`
        }),
        BlenderModule,
        QueueModule
    ],
    controllers: [AppController],
    providers: [BlenderService, SocketIoClientProvider, WorkerService],
})
export class AppModule { }
