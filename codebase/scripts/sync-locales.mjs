import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, 'resources/js');
const LANG_ROOT = path.join(ROOT, 'lang');
const LOCALES = ['en', 'nl', 'fr', 'es', 'de'];

async function main() {
    const files = await collectSourceFiles(JS_ROOT);
    const discovered = new Map();

    for (const file of files) {
        const source = await fs.readFile(file, 'utf8');
        const sourceFile = ts.createSourceFile(
            file,
            source,
            ts.ScriptTarget.Latest,
            true,
            scriptKindFor(file),
        );

        visit(sourceFile, (node) => {
            if (
                !ts.isCallExpression(node) ||
                !ts.isIdentifier(node.expression) ||
                node.expression.text !== 't'
            ) {
                return;
            }

            const key = readLiteral(node.arguments[0]);
            if (!key) {
                return;
            }

            discovered.set(key, { en: key });
        });
    }

    const existingByLocale = new Map();
    for (const locale of LOCALES) {
        existingByLocale.set(locale, await readLocaleFile(locale));
    }

    const allKeys = new Set(discovered.keys());
    for (const messages of existingByLocale.values()) {
        for (const key of Object.keys(messages)) {
            allKeys.add(key);
        }
    }

    const orderedKeys = [...allKeys].sort((left, right) => left.localeCompare(right));
    for (const locale of LOCALES) {
        const existing = existingByLocale.get(locale) ?? {};
        const output = {};

        for (const key of orderedKeys) {
            const english = discovered.get(key)?.en ?? existingByLocale.get('en')?.[key] ?? key;
            const translated =
                locale === 'en'
                    ? english
                    : existing[key] ?? english;

            output[key] = translated;
        }

        await fs.writeFile(
            path.join(LANG_ROOT, `${locale}.json`),
            `${JSON.stringify(output, null, 4)}\n`,
        );
    }

    console.log(
        `Synced ${orderedKeys.length} translation keys across ${LOCALES.join(', ')}.`,
    );
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectSourceFiles(fullPath));
            continue;
        }

        if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * @param {string} locale
 * @returns {Promise<Record<string, string>>}
 */
async function readLocaleFile(locale) {
    const filePath = path.join(LANG_ROOT, `${locale}.json`);

    try {
        const source = await fs.readFile(filePath, 'utf8');
        const decoded = JSON.parse(source);

        return isRecord(decoded) ? decoded : {};
    } catch {
        return {};
    }
}

/**
 * @param {ts.Node} node
 * @param {(node: ts.Node) => void} visitor
 */
function visit(node, visitor) {
    visitor(node);
    node.forEachChild((child) => visit(child, visitor));
}

/**
 * @param {ts.Expression | undefined} expression
 * @returns {string | null}
 */
function readLiteral(expression) {
    if (!expression) {
        return null;
    }

    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        return expression.text;
    }

    return null;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, string>}
 */
function isRecord(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        Object.values(value).every((item) => typeof item === 'string')
    );
}

/**
 * @param {string} file
 * @returns {ts.ScriptKind}
 */
function scriptKindFor(file) {
    if (file.endsWith('.tsx')) {
        return ts.ScriptKind.TSX;
    }

    if (file.endsWith('.ts')) {
        return ts.ScriptKind.TS;
    }

    if (file.endsWith('.jsx')) {
        return ts.ScriptKind.JSX;
    }

    return ts.ScriptKind.JS;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
