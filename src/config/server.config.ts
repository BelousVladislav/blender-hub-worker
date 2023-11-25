import { registerAs } from '@nestjs/config';

export default registerAs('serverConf', () => ({
    // NODE_ENV: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 6060,
    centralServerHost: process.env.CENTRAL_SERVER_KEY
}));