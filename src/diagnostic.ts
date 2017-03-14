import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

import * as luacheck from './luacheck';
import * as execution from './execution';

// :line:range: (code) message
export const diagnosticRe = /^:(\d+):(\d+)-(\d+): \(([EW])\d+\) (.+)$/
function str2diagserv(str: string): vscode.DiagnosticSeverity {
    switch (str) {
        case 'E':
            return vscode.DiagnosticSeverity.Error;
        case 'W':
            return vscode.DiagnosticSeverity.Warning;
        default:
            return vscode.DiagnosticSeverity.Information;
    }
}

export interface DiagnosticProvider {
    provideDiagnostic(document: vscode.TextDocument): Thenable<vscode.Diagnostic[]>
}

export function registerDiagnosticProvider(selector: vscode.DocumentSelector, provider: DiagnosticProvider, name: string): vscode.Disposable {
    let collection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(name);
    let cancellers = new Map<string, vscode.CancellationTokenSource>();
    let subsctiptions: vscode.Disposable[] = [];
    let lint = (document) => {
        if (!vscode.languages.match(selector, document)) return;
        const uri = document.uri;
        const uriStr = uri.toString();
        if (cancellers.has(uriStr)) {
            cancellers.get(uriStr).dispose();
        }
        cancellers.set(uriStr, new vscode.CancellationTokenSource);
        provider.provideDiagnostic(document).then((diagnostics) => collection.set(uri, diagnostics));
    };
    vscode.workspace.onDidChangeTextDocument((change) => lint(change.document), null, subsctiptions);
    vscode.workspace.onDidSaveTextDocument(document => lint(document), null, subsctiptions);
    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subsctiptions);
    return {
        dispose() {
            collection.dispose();
            for (let canceller of Array.from(cancellers.values())) {
                canceller.dispose();
            }
            vscode.Disposable.from(...subsctiptions).dispose();
        }
    };
}

export class LuacheckDiagnosticProvider implements DiagnosticProvider {
    provideDiagnostic(document: vscode.TextDocument): Thenable<vscode.Diagnostic[]> {
        return this.fetchDiagnostic(document).then((data) => { return this.parseDiagnostic(document, data); },
            (e: execution.FailedExecution) => {
                if (e.errorCode === execution.ErrorCode.BufferLimitExceed) {
                    vscode.window.showWarningMessage(
                        'Diagnostic was interpreted due to rack of buffer size. ' +
                        'The buffer size can be increased using `luacheck.diagnostic.maxBuffer`. '
                    );
                }
                return '';
            });
    }

    fetchDiagnostic(document: vscode.TextDocument): Thenable<string> {
        let [cmd, args] = luacheck.check(document);
        return execution.processString(cmd, args, {
            cwd: path.dirname(document.uri.fsPath),
            maxBuffer: luacheck.getConf<number>('diagnostic.maxBuffer')
        }).then((result) => result.stdout);
    }

    parseDiagnostic(document: vscode.TextDocument, data: string): vscode.Diagnostic[] {
        const prefixLen = document.uri.fsPath.length;
        let result: vscode.Diagnostic[] = []
        data.split(/\r\n|\r|\n/).forEach((line) => {
            line = line.substring(prefixLen);
            let matched = line.match(diagnosticRe);
            if (!matched) return;
            let sline: number = parseInt(matched[1]);
            let schar: number = parseInt(matched[2]);
            let echar: number = parseInt(matched[3]);
            let msg: string = matched[5];
            let type: vscode.DiagnosticSeverity = str2diagserv(matched[4]);
            let range = new vscode.Range(sline - 1, schar - 1, sline - 1, echar);
            result.push(new vscode.Diagnostic(range, msg, type));
        });
        return result;
    }
}