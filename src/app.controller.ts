import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    constructor(

    ) { }

    @Get()
    getHello(): string {
        return '<h1>Worker is work</h1>';
    }
}
