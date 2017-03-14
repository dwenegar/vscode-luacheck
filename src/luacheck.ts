import * as path from 'path';
import * as vscode from 'vscode';

export function getConf<T>(name: string): T {
    let conf = vscode.workspace.getConfiguration('luacheck');
    let value = conf.get<T>(name);
    if (value == null) {
        vscode.window.showErrorMessage(`Error: invalid configuration ${name}`);
    }
    return value;
}

function appendCheck(parameters: string[], opt: string, args: string[]) {
    if (args.length > 0) {
        parameters.push(opt)
        parameters.push(...args)
    }
}

export function command(...options: string[]): [string, string[]] {
    let cmd = getConf<string>('luacheck');
    if (process.platform == 'win32' && path.extname(cmd) != '.bat') {
        cmd += '.bat'
    }
    let args: string[] = [];
    args.push(...options);
    appendCheck(args, '--globals', getConf<string[]>('globals'));
    appendCheck(args, '--ignore', getConf<string[]>('ignore'));
    return [cmd, args];
}

export function check(document: vscode.TextDocument): [string, string[]] {
    return command(
        '--no-color',
        '--codes',
        '--ranges',
        '--formatter', 'plain',
        '--filename', document.uri.fsPath,
        '-')
}

export function version(lstring): [string, string[]] {
    return command("--version");
}
