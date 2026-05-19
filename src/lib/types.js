/**
 * HTML-safe JSON serializer for JSON-LD script tags.
 * JSON.stringify does NOT escape <, >, & by default — if any DB value
 * contains </script>, the HTML parser will prematurely close the script
 * tag, causing "Parse error: missing ',' or '}'" in Search Console.
 */
export function safeJsonLd(obj) {
    return JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}
