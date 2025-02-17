import * as assert from 'assert';

suite('Book Markdown Extension Tests', () => {
    test('Language configuration exists', () => {
        const configuration = require('../../../language-configuration.json');
        assert.ok(configuration);
        assert.ok(configuration.comments);
        assert.ok(configuration.brackets);
        assert.ok(configuration.autoClosingPairs);
    });

    test('Syntax highlighting grammar exists', () => {
        const grammar = require('../../../syntaxes/book.tmLanguage.json');
        assert.ok(grammar);
        assert.strictEqual(grammar.name, 'Book Markdown');
        assert.strictEqual(grammar.scopeName, 'text.book.markdown');
    });

    test('Grammar includes basic markdown patterns', () => {
        const grammar = require('../../../syntaxes/book.tmLanguage.json');
        const patterns = grammar.patterns;
        const repository = grammar.repository;

        // Check if patterns include our repository references
        assert.ok(patterns.some((p: any) => p.include === '#blocks'), 'Blocks pattern exists');
        assert.ok(repository.headers, 'Headers pattern exists');
        assert.ok(repository.inline, 'Inline pattern exists');
        assert.ok(repository.lists, 'Lists pattern exists');
        assert.ok(repository.blockquotes, 'Blockquotes pattern exists');
        assert.ok(repository.codeblocks, 'Code blocks pattern exists');
        assert.ok(repository.tables, 'Tables pattern exists');
    });

    test('Grammar supports headers syntax', () => {
        const grammar = require('../../../syntaxes/book.tmLanguage.json');
        const headers = grammar.repository.headers.patterns;

        assert.ok(headers.some((p: any) => p.name === 'heading.1.markdown'));
        assert.ok(headers.some((p: any) => p.name === 'heading.2.markdown'));
    });

    test('Grammar supports inline formatting', () => {
        const grammar = require('../../../syntaxes/book.tmLanguage.json');
        const inline = grammar.repository.inline.patterns;

        assert.ok(inline.some((p: any) => p.name === 'markup.bold.markdown'));
        assert.ok(inline.some((p: any) => p.name === 'markup.italic.markdown'));
        assert.ok(inline.some((p: any) => p.name === 'markup.inline.raw.string.markdown'));
        assert.ok(inline.some((p: any) => p.name === 'markup.underline.link.markdown'));
    });

    test('Grammar supports block elements', () => {
        const grammar = require('../../../syntaxes/book.tmLanguage.json');

        assert.strictEqual(grammar.repository.blockquotes.name, 'markup.quote.markdown');
        assert.strictEqual(grammar.repository.codeblocks.name, 'markup.fenced_code.block.markdown');
        assert.ok(grammar.repository.tables.patterns.some((p: any) => p.name === 'markup.table.markdown'));
    });
});