import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';

@Module({
    providers: [
        BlenderService
    ]
})
export class BlenderModule {

}
