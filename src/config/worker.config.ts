import { registerAs } from '@nestjs/config';

export default registerAs('workerConf', () => ({
    workeruuid: process.env.WORKERUUID || '',
}));