import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RenderService } from './render.service';

@Processor('render')
export class RenderProcessor {
    constructor(
        private renderService: RenderService,
    ) { }

    private readonly logger = new Logger(RenderProcessor.name);

    @Process('renderFile')
    async refreshOoekDebtors(job: Job, done: any) {
        await job.log('gogogo')
        await job.progress(100);
        done(null, { result: 1 });
    }
}