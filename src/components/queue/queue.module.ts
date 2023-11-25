import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RenderService } from './render/render.service';
import { BullModule } from '@nestjs/bull';
import { RenderProcessor } from './render/render.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/BullAdapter';
import { BlenderModule } from '../blender/blender.module';

@Module({
    imports: [
        BullModule.registerQueue(
            {
                name: 'render',
            }
        ),
        BullBoardModule.forFeature({
            name: 'render',
            adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
        }),
        BlenderModule
    ],
    providers: [QueueService, RenderService, RenderProcessor],
    exports: [QueueService]
})
export class QueueModule { }
