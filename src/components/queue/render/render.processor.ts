import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RenderService } from './render.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IRender } from './types';
import * as fs from 'fs';
import { join } from 'path';
import { stream } from 'winston';

@Processor('render')
export class RenderProcessor {
    constructor(
        private renderService: RenderService,
        private configService: ConfigService
    ) { }

    private readonly logger = new Logger(RenderProcessor.name);

    @Process('renderFile')
    async renderFile(job: Job, done: any) {
        console.log('||=====================================NEW-JOB=====================================||')
        let renderId = job.data.renderId;
        // console.log(renderId);
        // console.log(this.configService.get('serverConf.centralServerHost'))
        let axRes = await axios.get(`${this.configService.get('serverConf.centralServerHost')}render/${renderId}`);
        let render: IRender = axRes.data;
        console.log(`||jobId: ${job.id}`);
        console.log(`||projectId: ${render.projectId}`);
        console.log(`||projectName: ${render.project.name}`);
        console.log(`||projectDescription: ${render.project.description}`);
        console.log(`||inFileOriginalName: ${render.inFileOriginalName}`);
        console.log(`||inFileUUIDName: ${render.inFileUUIDName}`);
        console.log('||=====================================GET-FILE====================================||')
        try {
            let writeStream = fs.createWriteStream(join(process.cwd(), 'upload', render.inFileUUIDName));
            axRes = await axios.get(`${this.configService.get('serverConf.centralServerHost')}render/file/${render.inFileUUIDName}`, { responseType: 'stream' });
            let isFileLoad = await new Promise((resolve, reject) => {
                axRes.data.pipe(writeStream);
                let error = null;
                writeStream.on('error', err => {
                    error = err;
                    writeStream.close();
                    reject(false);
                });
                writeStream.on('close', () => {
                    if (!error) {
                        resolve(true)
                    }
                })
            });
            // fs.writeFileSync(join(process.cwd(), 'upload', render.inFileUUIDName), axRes.data);
            if (isFileLoad)
                console.log(`||file - ${render.inFileUUIDName} loaded from central server.`)
            else
                done('ERROR file loading from central server')
        } catch (err) {
            console.log(`||ERROR file loading from central server.`);
            done('ERROR file loading from central server')
        }
        console.log('||===================================START-RENDERING==================================||')
        let pathToFile = join(process.cwd(), 'upload', render.inFileUUIDName);// 'C:/Users/BeLiK/Documents/ОНТУ/Diplom/blender-hub-worker/upload/4ca16523-06ab-4f1b-b83c-df26611b4d78.blend'//
        let pathForOutFile = join(process.cwd(), 'rendered', render.inFileUUIDName.substring(0, render.inFileUUIDName.indexOf('.')));//'C:/Users/BeLiK/Documents/ОНТУ/Diplom/blender-hub-worker/rendered/4ca16523-06ab-4f1b-b83c-df26611b4d78'//
        // console.log(pathToFile);
        // console.log(pathForOutFile);
        this.renderService.runBlenderRendering(render, pathToFile, pathForOutFile, job, done);
    }
}