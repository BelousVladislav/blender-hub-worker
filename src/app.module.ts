import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import serverConfig from './config/server.config';
import { ConfigModule } from '@nestjs/config';
import { BlenderService } from './components/blender/blender.service';
import { BlenderModule } from './components/blender/blender.module';
import blenderConfig from './config/blender.config.';
import { SocketIoClientProvider } from './socket/socket-io-client.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: `${process.cwd()}/.env`,
            load: [serverConfig, blenderConfig],
            isGlobal: true,
        }),
        BlenderModule,
    ],
    controllers: [AppController],
    providers: [BlenderService, SocketIoClientProvider],
})
export class AppModule { }
