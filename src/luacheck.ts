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

function appendCheck(parameters: string[], opt: string, args: string) {
    if (args.length > 0) {
        parameters.push(opt, args);
    }
}

export function command(language: string, ...options: string[]): [string, string[]] {
    let cmd = getConf<string>('luacheck');
    if (process.platform == 'win32' && path.extname(cmd) != '.bat') {
        cmd += '.bat'
    }
    let args: string[] = [];
    appendCheck(args, '--globals', getConf<string>('globals'));
    appendCheck(args, '--ignore', getConf<string>('ignore'));
    args.push(...options);
    return [cmd, args];
}

export function check(language: string): [string, string[]] {
    return command(language, '--no-color', '--codes', '--ranges', '--formatter', 'plain', '-');
}

export function version(language: string): [string, string[]] {
    return command(language, "--version");
}
