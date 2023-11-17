import { registerAs } from '@nestjs/config';

export default registerAs('blenderConf', () => ({
    blenderPath: process.env.BLENDER_PATH
}));