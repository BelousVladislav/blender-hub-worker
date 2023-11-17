import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import spawnProcess from 'src/util/spawn';
const fs = require("fs");
const os = require("os");
import { getGPUTier } from 'detect-gpu';

export interface IBlenderInfo {
    blenderVersion: number;
    blenderOs: string;
    blenderGpu: string;
}

@Injectable()
export class BlenderService {
    BLENDER_PATH: string = this.configService.get('blenderConf.blenderPath');
    blenderInfo: IBlenderInfo;
    constructor(
        private configService: ConfigService
    ) { }

    async checkBlender(): Promise<IBlenderInfo> {
        if (!fs.existsSync(this.BLENDER_PATH + '.exe')) {
            console.log('blender.exe not found by path ' + this.BLENDER_PATH + '.exe. Edit property BLENDER_PATH in .env file');
            process.exit(1);
        }

        let blenderResult = await spawnProcess(this.BLENDER_PATH, [ // launch blender
            "--version",
        ]);
        let gpuResult = await spawnProcess('wmic', ['path', 'win32_VideoController', 'get', 'name']);
        this.blenderInfo = {
            blenderVersion: +blenderResult.message.match(/Blender \d+.\d+/)[0].replace('Blender ', ''),
            blenderOs: blenderResult.message.match(/\b(Windows|Mac|Linux)\b/)[0],
            blenderGpu: gpuResult.message.replace(/Name +/, '').match(/[A-Za-z0-9 ]+/)[0].replace('  ', '')
        }
        console.log(this.blenderInfo)
        return this.blenderInfo;
        // if (!this.BLENDER_PATH) {
        // let BLENDER_TAR_XZ = "./blender.tar.xz";
        // console.log(os.platform())
        // let blenderdata = await axios.get('https://download.blender.org/release/Blender3.6/blender-3.6.5-windows-x64.zip', { responseType: "arraybuffer" });
        // console.log("Writing blender.tar.xz to file...");
        // fs.writeFileSync(BLENDER_TAR_XZ, blenderdata.data)

        // await this.unzipZip(BLENDER_TAR_XZ);

        // // ok now we find where the binary is
        // let blenderVersionDir = fs.readdirSync(BLENDER_DIR)[0]; // there shouldn't be anything else in here.
        // let blenderVersionDirContents = fs.readdirSync(path.join(BLENDER_DIR, blenderVersionDir));
        // console.log(1234, path.join(BLENDER_DIR, blenderVersionDir))
        // // if (!blenderVersionDirContents.includes("blender")) {
        // //     console.log("Couldn't find blender in unzipped contents!!!");
        // //     exit(1);
        // // }

        // let blenderLocation = path.join(BLENDER_DIR, blenderVersionDir, "blender");
        // fs.writeFileSync(BLENDER_LOCATION_TXT, blenderLocation);
        // }
    }

    // async unzipZip(file: string, to: string): Promise<number> {
    //     return spawnProcess("unzip", [file, "-d", to]);
    // }

    //     async downloadProcessBlender() {
    //     console.log("Downloading blender.tar.xz...");
    //     let blenderdata = await axios.get(`${surl}/dat/blender.tar.xz`, { responseType: "arraybuffer" });
    //     console.log("Writing blender.tar.xz to file...");
    //     fs.writeFileSync(BLENDER_TAR_XZ, blenderdata.data);
    //     if (getFileHash(BLENDER_TAR_XZ, "hex") !== joinResponse.blenderhash) {
    //         console.log("Newly downloaded blender.tar.xz doesn't match the hash the server sent!!!\n(this is weird)");
    //         console.log(`Local ${getFileHash(BLENDER_TAR_XZ, "hex")} vs Server ${joinResponse.blenderhash}`)
    //         exit(1);
    //     }
    //     await unzipTar(BLENDER_TAR_XZ);

    //     // ok now we find where the binary is
    //     let blenderVersionDir = fs.readdirSync(BLENDER_DIR)[0]; // there shouldn't be anything else in here.
    //     let blenderVersionDirContents = fs.readdirSync(path.join(BLENDER_DIR, blenderVersionDir));
    //     console.log(1234, path.join(BLENDER_DIR, blenderVersionDir))
    //     // if (!blenderVersionDirContents.includes("blender")) {
    //     //     console.log("Couldn't find blender in unzipped contents!!!");
    //     //     exit(1);
    //     // }

    //     let blenderLocation = path.join(BLENDER_DIR, blenderVersionDir, "blender");
    //     fs.writeFileSync(BLENDER_LOCATION_TXT, blenderLocation);
    // }
}
