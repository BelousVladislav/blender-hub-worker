import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

export interface IWorker {
    workerid: string;
    workeruuid: string;
    donate: string;
    // blenderVersion: number;
    // os: string;
    // gpuName: string;
}

export interface IWorkerInfo extends IWorker {
    blenderVersion: number;
    os: string;
    gpuName: string;
}

@Injectable()
export class WorkerService {
    worker: IWorker;
    constructor(
        private configService: ConfigService
    ) {
        this.worker = {
            workerid: this.getWorkerId(),
            workeruuid: this.configService.get('workerConf.workeruuid'),
            donate: this.getDonateTxt(),
        }
        if (!this.worker.workeruuid) {
            console.error('Write your workeruuid from web-app to .env file!');
            process.exit(1);
        }
    }

    private getWorkerId(): string {
        let workerid: string = '';
        if (!fs.existsSync('./workerid.txt')) {
            workerid = uuidv4();
            fs.writeFileSync('./workerid.txt', workerid);
        } else {
            workerid = fs.readFileSync('./workerid.txt').toString()
        }
        return workerid
    }

    private getDonateTxt(): string {
        let donate: string = '';
        if (!fs.existsSync('./donate.txt'))
            fs.writeFileSync('./donate.txt', 'BTC=\nETH=\nByMeaCoffe=\nPatreon=');
        donate = fs.readFileSync('./donate.txt').toString()
        return donate
    }
}
