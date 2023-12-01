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
import path from 'path';
import * as fse from 'fs-extra'

@Processor('render')
export class RenderProcessor {
    constructor(
        private renderService: RenderService,
        private configService: ConfigService
    ) { }

    private readonly logger = new Logger(RenderProcessor.name);

    @Process('renderFile')
    async renderFile(job: Job, done: any) {
        let pathToFile: string = '';
        let pathForOutFile: string = '';
        let rarFolderPath: string;
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
            if (isFileLoad) {
                pathToFile = join(process.cwd(), 'upload', render.inFileUUIDName);
                pathForOutFile = join(process.cwd(), 'rendered', render.inFileUUIDName.substring(0, render.inFileUUIDName.lastIndexOf('.')));
                console.log(`||file - ${render.inFileUUIDName} loaded from central server.`);
                if (render.inFileUUIDName.substring(render.inFileUUIDName.lastIndexOf('.')) === '.rar') {
                    console.log(`||Start unRar file ${render.inFileUUIDName}`);
                    let rarPath = pathToFile;//join(process.cwd(), 'upload', render.inFileUUIDName);
                    let result = await this.renderService.unRar(rarPath, join(process.cwd(), 'upload'));
                    // if (fs.existsSync(rarPath))
                    //     fs.unlinkSync(rarPath);
                    // console.log('RREESSUULLTT', result)
                    rarFolderPath = join(process.cwd(), 'upload', render.inFileOriginalName.substring(0, render.inFileOriginalName.lastIndexOf('.')));
                    // let encodedPath = path.win32.normalize(rarFolderPath);\
                    let files: string[];
                    if (fs.existsSync(rarFolderPath)) {
                        files = await fs.readdirSync(rarFolderPath);
                        let blendFileName = files.find(item => item.substring(item.lastIndexOf('.')) === '.blend');
                        // console.log('PATH TO BLEND FILE', join(process.cwd(), 'upload', render.inFileOriginalName.substring(0, render.inFileOriginalName.lastIndexOf('.')), blendFileName))
                        pathToFile = join(process.cwd(), 'upload', render.inFileOriginalName.substring(0, render.inFileOriginalName.lastIndexOf('.')), blendFileName);
                    }
                    else
                        throw new Error('The archive must have a folder with the name of the archive');
                    // console.log('FILES', files);
                }
            }
            else {
                throw new Error('ERROR file loading from central server');
            }
        } catch (err) {
            try {
                await axios.patch(`${this.configService.get('serverConf.centralServerHost')}render`, { id: render.id, statusId: 4, message: 'The worker was unable to download the file for rendering: ' + err.toString() });
                console.log('||===================================JOB-FINISHED-SUCCESS================================||');
            } catch (error) {
                console.log('||=====================================JOB-FINISHED-WITH-ERROR=====================================||');
                await job.log(`Помилка при відправці прогресу до API: ${error.message}`);
                throw new Error('ERROR send request to central server');
            }
            console.log(`||ERROR file loading from central server2.`, err);
            done(new Error(`ERROR file loading: ${err}`));
            return;
        }
        console.log('||===================================START-RENDERING==================================||')
        console.log(pathToFile);
        console.log(pathForOutFile);
        let blRendRes = await this.renderService.runBlenderRendering(render, pathToFile, pathForOutFile, job, done, rarFolderPath);
        if (blRendRes.statusId === 3) {
            console.log('||===================================JOB-FINISHED-SUCCESS================================||');
        } else {
            await job.log(`ERROR: ${blRendRes.message || ''}`);
            console.log('||=====================================JOB-FINISHED-WITH-ERROR=====================================||');
        }
        try {
            await axios.patch(`${this.configService.get('serverConf.centralServerHost')}render`, blRendRes);
            // console.log(join(process.cwd(), 'upload'));
            // console.log('./upload')
            fse.emptyDirSync(join(process.cwd(), 'upload'));
        } catch (error) {
            console.log('||=====================================JOB-FINISHED-WITH-ERROR=====================================||');
            console.error('||Помилка при відправці прогресу до API:', error.message);
            await job.log(`Помилка при відправці прогресу до API: ${error.message}`);
        }
        // this.renderService.deleteAllInDir(join(process.cwd(), 'upload'))
        await job.progress(100);
        done(null, blRendRes)
    }
}