import * as child_process from 'child_process';

export interface Option {
    cwd: string,
    maxBuffer: number
}

export enum ErrorCode {
    Cancel,
    BufferLimitExceed
}

export interface Result {
    error: Error,
    stdout: string,
    stderr: string
}

export interface FailedExecution {
    errorCode: ErrorCode;
    result?: Result;
}

// for any filename, keep only the most recently spawned process
const procMap = new Map<string, child_process.ChildProcess>();

export function processString(cmd: string, args: string[], opt: Option, input: string, filename: string): Thenable<Result> {
    return new Promise((resolve, reject) => {
        let proc = child_process.execFile(cmd, args, opt,
            (error, stdout, stderr) => {
                // reject if cancelled
                if (procMap.get(filename) !== proc) {
                    reject(<FailedExecution>{
                        errorCode: ErrorCode.Cancel,
                        result: <Result>{ error, stdout, stderr }
                    });
                    return;
                }
                procMap.delete(filename);

                if (error != null && error.message === 'stdout maxBuffer exceeded.') {
                    reject(<FailedExecution>{
                        errorCode: ErrorCode.BufferLimitExceed,
                        result: <Result>{ error, stdout, stderr }
                    });
                } else {
                    resolve(<Result>{ error, stdout, stderr });
                }
            });
        proc.stdin!.end(input);

        // kill previous spawned process if exist
        const prevProc = procMap.get(filename);
        procMap.set(filename, proc);
        if (prevProc !== undefined) {
            prevProc.kill();
        }
    });
}
