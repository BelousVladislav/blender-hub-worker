import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';

@Module({
    providers: [
        BlenderService
    ],
    exports: [BlenderService]
})
export class BlenderModule {

}
