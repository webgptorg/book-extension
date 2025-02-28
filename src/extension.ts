import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    // Register document selectors for our custom language IDs
    const bookSelector: vscode.DocumentSelector = { language: 'book', scheme: 'file' };
    const bookMdSelector: vscode.DocumentSelector = { language: 'book-md', scheme: 'file' };

    // Register the language configuration for both file types
    if (bookSelector.language) {
        context.subscriptions.push(
            vscode.languages.setLanguageConfiguration(bookSelector.language, {
                wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
                comments: {
                    blockComment: ['<!--', '-->']
                },
                brackets: [
                    ['{', '}'],
                    ['[', ']'],
                    ['(', ')']
                ],
                onEnterRules: [
                    {
                        beforeText: /^\s*(?:[-*+]|\d+\.)\s+(?=.)/, // For lists
                        action: { indentAction: vscode.IndentAction.None, appendText: '' }
                    }
                ]
            })
        );
    }

    if (bookMdSelector.language) {
        context.subscriptions.push(
            vscode.languages.setLanguageConfiguration(bookMdSelector.language, {
                wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
                comments: {
                    blockComment: ['<!--', '-->']
                },
                brackets: [
                    ['{', '}'],
                    ['[', ']'],
                    ['(', ')']
                ],
                onEnterRules: [
                    {
                        beforeText: /^\s*(?:[-*+]|\d+\.)\s+(?=.)/, // For lists
                        action: { indentAction: vscode.IndentAction.None, appendText: '' }
                    }
                ]
            })
        );
    }

    // Register BookC custom editor provider
    const bookCEditorProvider = new BookCEditorProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'bookc.preview',
            bookCEditorProvider,
            {
                webviewOptions: {
                    enableScripts: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );

    // Log activation
    console.log('Book Markdown extension is now active');
}

/**
 * Provider for BookC file format - a compiled version of .book files
 * This is a JSON in ZIP format that should be viewed, not edited directly
 */
class BookCEditorProvider implements vscode.CustomReadonlyEditorProvider {
    constructor(
        private readonly extensionUri: vscode.Uri
    ) { }

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return { uri, dispose: () => { } };
    }

    async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        
        // Set webview HTML content
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document.uri);
    }

    private getHtmlForWebview(webview: vscode.Webview, fileUri: vscode.Uri): string {
        const fileName = path.basename(fileUri.fsPath);
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BookC Preview</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: var(--vscode-editor-foreground);
                    margin-bottom: 20px;
                    font-size: 24px;
                }
                .info-box {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-left: 4px solid #d33;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 2px;
                }
                .file-info {
                    margin-top: 20px;
                    padding: 10px;
                    background-color: var(--vscode-editor-lineHighlightBackground);
                    border-radius: 4px;
                }
                .code {
                    font-family: 'Courier New', monospace;
                    background-color: var(--vscode-editor-lineHighlightBackground);
                    padding: 4px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>BookC File Viewer</h1>
                
                <div class="info-box">
                    <p><strong>This is a compiled BookC file (.bookc)</strong></p>
                    <p>A .bookc file is a compiled version of a .book file containing JSON data in a compressed ZIP format.</p>
                    <p>This file is intended for consumption by tools and should not be edited directly.</p>
                </div>
                
                <div class="file-info">
                    <p><strong>File:</strong> ${fileName}</p>
                    <p><strong>Format:</strong> JSON in ZIP</p>
                </div>
                
                <p>If you need to make changes to this file, you should edit the original <span class="code">.book</span> source file and recompile it.</p>
            </div>
        </body>
        </html>
        `;
    }
}

export function deactivate() {}