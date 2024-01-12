import * as vscode from 'vscode';

export function getConf<T>(name: string, defaultValue: T): T {
    let conf = vscode.workspace.getConfiguration('luacheck');
    let value = conf.get<T>(name);
    if (value) {
        return value;
    }
    return defaultValue;
}

function appendCheck(parameters: string[], opt: string, args: string[] | undefined) {
    if (args && args.length > 0) {
        parameters.push(opt);
        parameters.push(...args);
    }
}

export function command(...options: string[]): [string, string[]] {
    let cmd = getConf<string>('luacheck', 'luacheck');
    let args: string[] = [];
    args.push(...options);
    appendCheck(args, '--globals', getConf<string[]>('globals', []));
    appendCheck(args, '--ignore', getConf<string[]>('ignore', []));
    return [cmd, args];
}

export function check(document: vscode.TextDocument): [string, string[]] {
    return command(
        '--no-color',
        '--codes',
        '--ranges',
        '--formatter', 'plain',
        '--filename', document.uri.fsPath,
        '-');
}

export function version(): [string, string[]] {
    return command('--version');
}
