import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue, Job, JobStatus } from 'bull';

@Injectable()
export class RenderService {
    constructor() {

    }
}
