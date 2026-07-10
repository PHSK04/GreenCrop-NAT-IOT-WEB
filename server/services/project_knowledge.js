const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const KNOWLEDGE_FILES = [
    'README.md',
    'ai/README.md',
    'docs/reference/API.md',
    'docs/GreenCropNAT_Admin_System_Spec.md',
    'docs/guides/IOT_GUIDE.md',
    'docs/guides/PROJECT_STRUCTURE.md',
];

let cachedChunks = null;

function cleanMarkdown(value) {
    return String(value || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[|*_>`#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitDocument(source, markdown) {
    const lines = String(markdown || '').split(/\r?\n/);
    const chunks = [];
    let heading = source;
    let body = [];
    const flush = () => {
        const text = cleanMarkdown(body.join('\n'));
        if (text.length >= 35) chunks.push({ source, heading, text: text.slice(0, 1200) });
        body = [];
    };
    for (const line of lines) {
        const match = line.match(/^#{1,3}\s+(.+)/);
        if (match) {
            flush();
            heading = cleanMarkdown(match[1]);
        } else {
            body.push(line);
        }
    }
    flush();
    return chunks;
}

function loadKnowledgeChunks() {
    if (cachedChunks) return cachedChunks;
    cachedChunks = KNOWLEDGE_FILES.flatMap((source) => {
        try {
            return splitDocument(source, fs.readFileSync(path.join(PROJECT_ROOT, source), 'utf8'));
        } catch (_) {
            return [];
        }
    });
    return cachedChunks;
}

function queryTerms(query) {
    const normalized = String(query || '').toLowerCase();
    const terms = normalized.match(/[a-z0-9_/-]{2,}|[\u0E00-\u0E7F]{2,}/g) || [];
    const aliases = [
        [/ปั๊ม|pump/, ['mqtt', 'control', 'machine']],
        [/เซ็นเซอร์|sensor|ph|ec|อุณหภูมิ/, ['sensor', 'telemetry', 'mqtt']],
        [/ล็อกอิน|login|สมัคร|auth/, ['auth', 'user', 'session']],
        [/อุปกรณ์|device|จับคู่|pair/, ['device', 'pair', 'iot']],
        [/แอดมิน|admin|ผู้ดูแล/, ['admin', 'role', 'database']],
        [/api|endpoint|route/, ['api', 'get', 'post']],
        [/ติดตั้ง|รัน|run|install/, ['install', 'npm', 'server']],
    ];
    for (const [pattern, additions] of aliases) {
        if (pattern.test(normalized)) terms.push(...additions);
    }
    return [...new Set(terms)].slice(0, 20);
}

function searchProjectKnowledge(query, { limit = 4 } = {}) {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    return loadKnowledgeChunks()
        .map((chunk) => {
            const heading = chunk.heading.toLowerCase();
            const haystack = `${heading} ${chunk.text.toLowerCase()}`;
            const score = terms.reduce((total, term) => {
                if (!haystack.includes(term)) return total;
                return total + (heading.includes(term) ? 5 : 2);
            }, 0);
            return { ...chunk, score };
        })
        .filter((chunk) => chunk.score > 0)
        .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
        .slice(0, Math.max(1, Math.min(6, Number(limit) || 4)))
        .map(({ score, ...chunk }) => chunk);
}

function clearProjectKnowledgeCache() {
    cachedChunks = null;
}

module.exports = { KNOWLEDGE_FILES, clearProjectKnowledgeCache, searchProjectKnowledge, splitDocument };
