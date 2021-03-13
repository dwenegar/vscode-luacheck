import * as vscode from 'vscode';
import * as configuration from "./configuration"

import { DiagnosticProvider } from './diagnostic'

const LUA_MODE: vscode.DocumentSelector = [
    { language: 'lua', scheme: 'file' }
];

let collection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('lua');

function registerDiagnosticProvider(selector: vscode.DocumentSelector, provider: DiagnosticProvider, subscriptions: vscode.Disposable[]) {
    let clearDiagnostics = (document) => {
        if (vscode.languages.match(selector, document)) {
            const uri = document.uri;
            collection.set(uri, null);
        }
    };
    let lint = (document) => {
        if (vscode.languages.match(selector, document)) {
            const uri = document.uri;
            provider.provideDiagnostic(document).then((diagnostics) => collection.set(uri, diagnostics));
        }
    };
    vscode.workspace.onDidChangeTextDocument(change => lint(change.document), null, subscriptions);
    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidCloseTextDocument(document => clearDiagnostics(document), null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) lint(editor.document)
    }, null, subscriptions);
    vscode.workspace.onDidChangeConfiguration(() => {
        if (vscode.window.activeTextEditor) {
            lint(vscode.window.activeTextEditor.document);
        }
    }, null, subscriptions);
    if (vscode.window.activeTextEditor) {
        lint(vscode.window.activeTextEditor.document);
    }
}

export function activate(context: vscode.ExtensionContext) {

    let confTester = new configuration.ConfigurationTester;
    context.subscriptions.push(confTester);
    vscode.window.onDidChangeActiveTextEditor(editor => confTester.test(), null, context.subscriptions);
    let diagnosticProvider: DiagnosticProvider = new DiagnosticProvider;
    registerDiagnosticProvider(LUA_MODE, diagnosticProvider, context.subscriptions);
}

export function deactivate() {
}