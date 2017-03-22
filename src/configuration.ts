import * as vscode from 'vscode';
import * as child_process from 'child_process';

import * as luacheck from './luacheck'


export class ConfigurationTester implements vscode.Disposable {

    processes: Map<number, child_process.ChildProcess>;

    constructor() {
        this.processes = new Map<number, child_process.ChildProcess>();
    }

    test(): void {
        let [cmd, args] = luacheck.version();
        let proc = child_process.execFile(cmd, args, (error, stdout, stderr) => {
            if (error) {
                if ((<any>error).code == 'ENOENT') {
                    vscode.window.showErrorMessage('Please install [luacheck](https://github.com/mpeterv/luacheck) or check configuration `luacheck.path`')
                } else {
                    vscode.window.showErrorMessage('Please check your configurations')
                }
                vscode.window.showErrorMessage(stderr.toString());
            }
            this.processes.delete(proc.pid);
        });
        this.processes.set(proc.pid, proc);
    }

    dispose() {
        for (let proc of Array.from(this.processes.values())) {
            proc.kill();
        }
    }
}
