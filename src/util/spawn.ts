import { spawn } from "child_process";

export default async function spawnProcess(command: string, args: Array<string>): Promise<{ code: number, message: string }> {
    // console.log(`Spawning ${command}`);

    return new Promise((resolve, reject) => {
        const cmd = spawn(command, args);
        let result: { code: number, message: string } = { code: 0, message: '' };
        cmd.stdout.on("data", (data) => {
            result.message = result.message + data.toString();
            process.stdout.write(data.toString());
        });

        cmd.stderr.on("data", (data) => {
            process.stdout.write(data.toString());
        });

        cmd.on("close", code => {
            result.code = code;
            if (result.code != 0) reject(result);
            else resolve(result);
        });
    });
}