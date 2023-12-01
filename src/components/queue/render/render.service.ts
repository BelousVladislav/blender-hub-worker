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
import fss from 'fs/promises';

export interface IBlenderRenderResult {
    id: number,
    statusId: number,
    progress: number
    message?: string,
}
@Injectable()
export class RenderService {
    constructor(
        private blenderService: BlenderService,
        private configService: ConfigService
    ) {

    }

    async unRar(file: string, to: string): Promise<{ code: number; message: string; }> {
        return spawnProcess("C:/Program Files/WinRAR/UnRAR.exe", ['x', file, to]);
    }

    // async deleteAllInDir(dirPath) {
    //     try {
    //         fs.rmSync(dirPath, { recursive: true });

    //         await fss.mkdir(dirPath);
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }

    runBlenderRendering(render: IRender, blendFilePath: string, outFilePath: string, job: Job, done: any, rarFolderPath?: string) {
        return new Promise<IBlenderRenderResult>((resolve, reject) => {
            let prevProgressPercentage: number = 0;
            let progressPercentage: number = 0;
            let outPrevProgressPercentage: number = 0;
            let outProgressPercentage: number = 0;
            const blenderProcess = spawn(this.blenderService.BLENDER_PATH, [
                '-b',
                blendFilePath,
                '-o',
                outFilePath,
                '-F',
                'JPEG',
                '-f',
                '1', // количество кадров для рендеринга
                '--verbose', '1' // для получения подробного вывода
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
                                console.log(`||Прогрес рендерингу: ${renderedSamples}/${countSamples} Samples - ${progressPercentage}%`);
                                await job.log(`Прогрес рендерингу: ${renderedSamples}/${countSamples} Samples - ${progressPercentage}%`)
                                await job.progress(progressPercentage);
                                render.progress = progressPercentage;
                                try {
                                    await axios.patch(`${this.configService.get('serverConf.centralServerHost')}render`, { id: render.id, progress: render.progress, statusId: 2 });
                                } catch (error) {
                                    console.error('||Помилка при відправці прогресу до API:', error.message);
                                }
                            }
                        }
                    }
                }
            });

            blenderProcess.stderr.on('data', async (data: Buffer) => {
                await job.log(`Помилка: ${data}`);
                console.log(`||Помилка: ${data}`);
                render.message = data.toString();
            });

            blenderProcess.on('close', async (code: number) => {
                await job.log(`Процес завершено з кодом ${code}`);
                console.log(`||Процес завершено з кодом ${code}`);
                let rnd: IBlenderRenderResult = {
                    id: render.id,
                    statusId: 3,
                    message: '',
                    progress: render.progress
                }
                try {
                    if (code === 0) {
                        let renderedFiles = fs.readdirSync(join(process.cwd(), 'rendered'));
                        let renderedFile = renderedFiles.find(item => item.includes(render.inFileUUIDName.substring(0, render.inFileUUIDName.lastIndexOf('.'))));
                        let filePath = join(process.cwd(), 'rendered', renderedFile);
                        if (fs.existsSync(filePath)) {
                            rnd.progress = 100;
                            const form_data = new FormData();
                            let file = fs.readFileSync(filePath);
                            form_data.append('file', new Blob([file]), renderedFile)
                            try {
                                await axios.post(`${this.configService.get('serverConf.centralServerHost')}render/uploadRenderedFileFromWorker/${render.id}`, form_data);
                                await job.progress(100);
                                resolve(rnd);
                                console.log('||Файл надіслано клієнту');
                                await job.log('Файл надіслано клієнту');
                            } catch (error) {
                                await job.log(`Помилка при відправці файлу клієнту до API: ${error.message}`);
                                throw new Error('Error sending file to client to API.')
                                // console.error('||Помилка при відправці файлу клієнту до API:', error.message);
                                // rnd.statusId = 4;
                                // rnd.message = 'Error sending file to client to API.';
                            } finally {
                                fs.unlinkSync(join(process.cwd(), 'rendered', renderedFile));
                            }
                        } else {
                            throw new Error('The worker does not know the rendering file.')
                            // rnd.statusId = 4;
                            // rnd.message = 'Воркер не знайшов файл рендерингу.';
                        }
                    } else {
                        throw new Error('An error occurred while rendering the file.')
                        // rnd.statusId = 4;
                        // rnd.message = 'Виникла помилка під час рендерингу файла.';
                    }
                } catch (err) {
                    rnd.statusId = 4;
                    rnd.progress = render.progress;
                    rnd.message = `ERROR: ${err.toString()}`;
                    reject(rnd);
                } finally {
                    // if (fs.existsSync(blendFilePath))
                    //     fs.unlinkSync(blendFilePath);
                    // if (rarFolderPath && fs.existsSync(rarFolderPath))
                    //     fs.rmSync(rarFolderPath, { recursive: true, force: true });
                    prevProgressPercentage = 0;
                    progressPercentage = 0;
                }
            });
        })
    }


}
