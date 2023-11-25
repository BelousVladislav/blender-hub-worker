import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue, Job, JobStatus } from 'bull';
import { BlenderService } from '../../blender/blender.service';
import spawnProcess from 'src/util/spawn';
import { spawn } from 'child_process';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IRender } from './types';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class RenderService {
    constructor(
        private blenderService: BlenderService,
        private configService: ConfigService
    ) {

    }

    async runBlenderRendering(render: IRender, blendFilePath: string, outFilePath: string, job: Job, done: any) {
        let prevProgressPercentage: number = 0;
        let progressPercentage: number = 0;
        let outPrevProgressPercentage: number = 0;
        let outProgressPercentage: number = 0;
        const blenderProcess = spawn(this.blenderService.BLENDER_PATH, [
            '-b',
            blendFilePath,
            '-o',
            outFilePath,
            '-f',
            '1', // количество кадров для рендеринга
            '--verbose' // для получения подробного вывода
        ]);

        blenderProcess.stdout.on('data', async (data: Buffer) => {
            const output = data.toString();
            // console.log(output)
            const progressMatch = output.match(/(Rendered|Rendering|Sample)\s*\d+\s*?\/\s*?\d+/)
            let countSamples: number = 0;
            let renderedSamples: number = 0;
            if (progressMatch) {
                let pM = progressMatch[0].replaceAll('Rendered', '').replaceAll('Rendering', '').replaceAll('Sample', '').replaceAll(' ', '');
                countSamples = parseInt(pM.substring(pM.indexOf('/') + 1));
                renderedSamples = parseInt(pM.substring(0, pM.indexOf('/')));

                if (countSamples > renderedSamples) {
                    prevProgressPercentage = progressPercentage;
                    progressPercentage = Math.round((renderedSamples * 100) / countSamples);
                    outProgressPercentage = progressPercentage;
                    if (prevProgressPercentage !== progressPercentage && progressPercentage <= 100 && (prevProgressPercentage + 1) === progressPercentage) {
                        if ((outProgressPercentage - outPrevProgressPercentage) >= 5 || outProgressPercentage === 1 || outProgressPercentage === 100) {
                            if (outProgressPercentage !== 1 && outProgressPercentage !== 100)
                                outPrevProgressPercentage = outProgressPercentage;
                            await job.progress(progressPercentage);
                            render.progress = progressPercentage;
                            try {
                                await axios.patch(`${this.configService.get('serverConf.centralServerHost')}render`, render);
                            } catch (error) {
                                console.error('||Помилка при відправці прогресу до API:', error.message);
                            }
                            console.log(`||Прогрес рендерингу: ${renderedSamples}/${countSamples} Samples - ${progressPercentage}%`);
                            await job.log(`Прогрес рендерингу: ${renderedSamples}/${countSamples} Samples - ${progressPercentage}%`)
                        }
                    }
                }
            }
        });

        blenderProcess.stderr.on('data', async (data: Buffer) => {
            await job.log(`Помилка: ${data}`);
            console.error(`||Завершено з помилкою: ${data}`);
            try {
                render.statusId = 4;
                render.message = `Помилка: ${data}`;
                await axios.patch(`${this.configService.get('serverConf.centralServerHost')}render`, render);
            } catch (error) {
                console.error('||Помилка при відправці прогресу до API:', error.message);
            }
            if (fs.existsSync(blendFilePath))
                fs.unlinkSync(blendFilePath);
            prevProgressPercentage = 0;
            progressPercentage = 0;
            console.log('||=====================================JOB-FINISHED-WITH-ERROR=====================================||');
            done(data);
        });

        blenderProcess.on('close', async (code: number) => {
            let renderedFiles = fs.readdirSync(join(process.cwd(), 'rendered'));
            let renderedFile = renderedFiles.find(item => item.includes(render.inFileUUIDName.substring(0, render.inFileUUIDName.indexOf('.'))))
            const form_data = new FormData();
            let file = fs.readFileSync(join(process.cwd(), 'rendered', renderedFile));
            form_data.append('file', new Blob([file]), renderedFile)
            try {
                await axios.post(`${this.configService.get('serverConf.centralServerHost')}render/uploadRenderedFileFromWorker/${render.id}`, form_data);
                console.log('||Файл надіслано клієнту')
            } catch (error) {
                console.error('||Помилка при відправці прогресу до API:', error.message);
            }
            if (fs.existsSync(blendFilePath))
                fs.unlinkSync(blendFilePath);
            if (fs.existsSync(join(process.cwd(), 'rendered', renderedFile)))
                fs.unlinkSync(join(process.cwd(), 'rendered', renderedFile));
            await job.log(`Процес завершено з кодом ${code}`);
            console.log(`||Процес завершено з кодом ${code}`);
            await job.progress(100);
            prevProgressPercentage = 0;
            progressPercentage = 0;
            console.log('||===================================JOB-FINISHED-SUCCESS================================||');
            done(null, { code: code });
        });
    }
}
