import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import JSZip from 'jszip';

// Define our own interfaces since the VSCode API version might not include these
interface CustomDocument {
    uri: vscode.Uri;
    dispose(): void;
}

interface CustomDocumentEditEvent {
    document: CustomDocument;
}

interface CustomEditorProvider {
    onDidChangeCustomDocument?: vscode.Event<CustomDocumentEditEvent>;
    openCustomDocument?(uri: vscode.Uri, openContext: any, token: vscode.CancellationToken): Promise<CustomDocument>;
    resolveCustomEditor(document: CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void>;
}

export function activate(context: vscode.ExtensionContext) {




    const outputChannel = vscode.window.createOutputChannel('Promptbook');
    outputChannel.show(false); // Show the channel in the Output panel


    outputChannel.appendLine('✨ Promptbook');


    // Show notification to make activation more visible
    vscode.window.showInformationMessage('Promptbook [extension](https://ptbk.io/) activated !!!');


    // Register document selectors for our custom language IDs
    const bookSelector: vscode.DocumentSelector = { language: 'book', scheme: 'file' };

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



    // Register Bookc custom editor provider
    const bookcEditorProvider = new BookcEditorProvider(outputChannel,context.extensionPath);

    // Use registerTextEditorViewColumn as a fallback since registerCustomEditor might not exist
    try {
        // @ts-ignore - Using VSCode API that might not be in the typings
        context.subscriptions.push(vscode.window.registerCustomEditorProvider('bookc.preview', bookcEditorProvider));
    } catch (error) {

        if(!(error instanceof Error)){
            throw error;
        }

        // Alternative registration for older VSCode versions
        outputChannel.appendLine(`Alternative registration for older VSCode versions`);
        outputChannel.appendLine(error.stack || error.message);
        context.subscriptions.push(
            vscode.workspace.registerTextDocumentContentProvider('bookc.preview', {
                provideTextDocumentContent(_uri: vscode.Uri): string {
                    // Return a simple placeholder for older VSCode versions
                    return "Book Preview not available in this VSCode version. Please update VSCode.";
                }
            })
        );

        // Add command to open the preview
        context.subscriptions.push(
            vscode.commands.registerCommand('bookc.openPreview', async () => {

                outputChannel.appendLine(`bookc.openPreview command invoked`);

                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    outputChannel.appendLine(`No active editor found`);
                    return;
                }

                const panel = vscode.window.createWebviewPanel(
                    'bookc.preview',
                    'BookC Preview',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: true,
                        localResourceRoots: [vscode.Uri.file(context.extensionPath)]
                    }
                );

                await bookcEditorProvider.resolveCustomEditor(
                  {
                    uri: editor.document.uri,
                    dispose: () => {}
                }, panel, new vscode.CancellationTokenSource().token);
            })
        );
    }


    outputChannel.appendLine('`.book` extension is now active');
}

/**
 * Provider for Bookc file format - a compiled version of .book files
 * This is a JSON in ZIP format that should be viewed, not edited directly
 */
class BookcEditorProvider implements CustomEditorProvider {
    constructor(
        private readonly outputChannel: vscode.OutputChannel,
        private readonly extensionPath: string
    ) {
      this.outputChannel.appendLine(`BookcEditorProvider.constructor`);

    }

    // Required for CustomEditorProvider interface
    onDidChangeCustomDocument = new vscode.EventEmitter<CustomDocumentEditEvent>().event;

    // Create and return a custom document
    async openCustomDocument(
        uri: vscode.Uri,
        _openContext: { backupId?: string },
        _token: vscode.CancellationToken
    ): Promise<CustomDocument> {
        return {
            uri,
            dispose: () => {}
        };
    }

    async resolveCustomEditor(
        document: CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath)]
        };

        this.outputChannel.appendLine(`Test book-extension ptbk`);

        // Set webview HTML content
        // console.log('!!! keepUnused',document,this.getHtmlForWebview)
        // webviewPanel.webview.html = `Testing content of bookc preview !!! `;
        webviewPanel.webview.html = await this.getHtmlForWebview(document.uri, webviewPanel.webview);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        });
    }

    private async getHtmlForWebview(fileUri: vscode.Uri, _webview: vscode.Webview): Promise<string> {


        const fileName = path.basename(fileUri.fsPath);

        // Try to read and parse the .bookc file
        let fileContent = "Unable to read file content";
        let isValid = false;
        let jsonData = {};
        let title = 'Compiled Book Preview';

        // TODO: !!! Preview metadata
        // TODO: !!! Preview tasks, personas, and knowledge

        try {
            // Check if the file has a .bookc extension
            if (fileUri.fsPath.endsWith('.bookc')) {


                // Read file as binary data for zip processing
                const fileBuffer = fs.readFileSync(fileUri.fsPath);


                try {
                    // Load the zip file
                    const zip = new JSZip();
                    const zipContent = await zip.loadAsync(fileBuffer);


                    // Extract the index.book.json file from the zip
                    const indexFile = zipContent.file('index.book.json');

                    if (indexFile) {
                        // Get the content of the index file
                        fileContent = await indexFile.async('string');


                        try {
                            // Try to parse as JSON
                            jsonData = JSON.parse(fileContent);
                            isValid = true;
                            title = (jsonData as any)[0].title;
                        } catch (error) {
                            // Type-safe error handling
                            const jsonError = error as Error;
                            fileContent = `Error parsing JSON: ${jsonError.message || 'Unknown error'}\n\nRaw content:\n${fileContent.substring(0, 500)}${fileContent.length > 500 ? '...' : ''}`;
                        }
                    } else {
                        fileContent = "No 'index.book.json' file found in the .bookc archive";
                    }
                } catch (error) {
                    if(!(error instanceof Error)){
                      throw error;
                    }
                    fileContent = `Error extracting ZIP content: ${error.message || 'Unknown error'}\n\nThis .bookc file may not be a valid ZIP archive.`;
                }
            } else {
                fileContent = "Not a .bookc file";
            }
        } catch (error) {
            if(!(error instanceof Error)){
              throw error;
            }

            fileContent = `Error reading file: ${error.message || 'Unknown error'}`;
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
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
                        border-left: 4px solid ${isValid?'#38f':'#d33'};
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
                    .json-view {
                        font-family: 'Courier New', monospace;
                        background-color: var(--vscode-editor-lineHighlightBackground);
                        padding: 10px;
                        border-radius: 4px;
                        max-height: 400px;
                        overflow: auto;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }
                    .json-key { color: var(--vscode-symbolIcon-classForeground, #569cd6); }
                    .json-value { color: var(--vscode-symbolIcon-stringForeground, #ce9178); }
                    .json-string { color: var(--vscode-symbolIcon-stringForeground, #ce9178); }
                    .json-number { color: var(--vscode-symbolIcon-numberForeground, #b5cea8); }
                    .json-boolean { color: var(--vscode-symbolIcon-booleanForeground, #4e94ce); }
                    .json-null { color: var(--vscode-symbolIcon-nullForeground, #569cd6); }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${title}</h1>

                    <div class="info-box">
                        <p><strong>This is a compiled Book file (.bookc)</strong></p>
                        <p>A .bookc file is a compiled version of a .book file containing JSON data in a compressed ZIP format.</p>
                        <p>This file is intended for consumption by tools and should not be edited directly.</p>
                    </div>

                    <div class="file-info">
                        <p><strong>File:</strong> ${fileName}</p>
                        <p><strong>Format:</strong> JSON ${isValid ? '(Valid)' : '(Invalid or not JSON)'}</p>
                    </div>

                    ${isValid ? `
                    <h2>File Content:</h2>
                    <div class="json-view">${this.formatJsonForDisplay(jsonData)}</div>
                    ` : `
                    <h2>File Content:</h2>
                    <div class="json-view">${fileContent}</div>
                    `}

                    <p>If you need to make changes to this file, you should edit the original <span class="code">.book</span> source file and recompile it.</p>
                </div>

                <script>
                    // Script for webview interaction
                    (function() {
                        const vscode = acquireVsCodeApi();

                        // Report any errors to VSCode
                        window.onerror = function(message, source, line, column, error) {
                            vscode.postMessage({
                                command: 'alert',
                                text: \`Error: \${message} at \${line}:\${column}\`
                            });
                        };
                    })();
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Format JSON for syntax highlighting in the webview
     */
    private formatJsonForDisplay(json: any): string {
        const formatted = JSON.stringify(json, null, 2);
        // Simple syntax highlighting with regex
        return formatted
            /*
            TODO:
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/"([^"]+)"(?!:)/g, '<span class="json-string">"$1"</span>')
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
            .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
            .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="json-number">$1</span>');
            */
    }
}

export function deactivate() {
  // TODO: Implement cleanup logic here
}


/**
 * TODO: Avoid callback hell - use fail-fast approach
 */