import * as vscode from 'vscode';

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

    // Log activation
    console.log('Book Markdown extension is now active');
}

export function deactivate() {}