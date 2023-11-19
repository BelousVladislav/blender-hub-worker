import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, io } from 'socket.io-client';
import { IWorkerInfo } from '../worker/worker.service';


@Injectable()
export class SocketIoClientProvider {
    private socket: Socket;
    private socketId: string;
    private workerInfo: IWorkerInfo;
    constructor(private readonly config: ConfigService) {
        // this.connect();
    }

    async initWorker(workerInfo: IWorkerInfo) {
        this.workerInfo = workerInfo;
        this.connect();
    }
    private connect() {
        this.socket = io('http://192.168.31.232:80/worker');//this.config.get('SOCKET_SERVER')
        this.socket.on('connect', () => {
            this.socketId = this.socket.id;
            this.registerWorker(this.workerInfo);
            console.log(`${this.socket.id} connected to main server;`);
            console.log('Worker registered!')
        });
        this.socket.on('disconnect', () => {
            console.log(`${this.socketId} disconnected from main server;`)
        })
        return this.socket;
    }

    getSocket = () => {
        if (!this.socket) {
            return this.connect();
        }
        return this.socket;
    };

    registerWorker(workerInfo: IWorkerInfo) {
        this.socket.emit('registerWorker', workerInfo);
    }
}