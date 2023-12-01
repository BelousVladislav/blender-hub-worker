export interface IUser {
    id: number;
    login: string;
    email: string;
    password: string;
    client_uuid: string;
    worker_uuid: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IWorker {
    id: string;
    blenderVersion: number;
    os: string;
    gpuName: string;
    donate: string;
    user: IUser;
    userId: number;
    isOnline: boolean;
    currSocketId: string;
    renders: IRender[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IRender {
    id: number;
    project: IProject;
    projectId: number;
    inFileOriginalName: string;
    inFileUUIDName: string;
    inFilePath: string;
    status: IStatus;
    statusId: number;
    worker: Worker;
    workerId: string;
    progress: number;
    message: string;
    outFileOriginalName: string;
    outFileUUIDName: string;
    outFilePath: string
    createdAt: Date;
    updatedAt: Date;
}

export interface IProject {
    id: number;
    name: string;
    user: IUser;
    userId: string;
    description: string;
    tags: string;
    uuidToken: string;
    renders: IRender[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IStatus {
    id: number;
    name: string;
    renders: IRender[];
    createdAt: Date;
    updatedAt: Date;
}