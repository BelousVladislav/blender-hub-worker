import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue, Job, JobStatus } from 'bull';

@Injectable()
export class QueueService {
    queues: Map<string, Queue>;
    constructor(
        @InjectQueue('render') private readonly renderQueue: Queue,
    ) {
        this.queues = new Map([['render', renderQueue]]);
    }

    async addJob(
        queueName: string,
        processName: string,
        data: any,
    ): Promise<Bull.Job<any>> {
        return await this.queues.get(queueName).add(processName, data);
    }
}
