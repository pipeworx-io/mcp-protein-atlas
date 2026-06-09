interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Human Protein Atlas (HPA) MCP — keyless.
 *
 * Expression & localization atlas for human proteins: search genes, get a
 * protein's tissue/cell expression, subcellular localization, protein class,
 * and disease involvement, or list its top-expressing tissues by RNA nTPM.
 * Use Ensembl gene ids (search_genes returns them).
 */


const BASE = 'https://www.proteinatlas.org';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_genes',
    description:
      'Search the Human Protein Atlas for human genes/proteins by gene symbol or keyword. Returns each gene with its Ensembl gene id (needed by get_protein and top_tissues), synonyms, and description. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gene symbol (e.g. "EGFR") or keyword (e.g. "insulin receptor").' },
        limit: { type: 'number', description: 'Max genes to return (default 15).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_protein',
    description:
      "Get a trimmed Human Protein Atlas profile for one protein by Ensembl gene id (e.g. \"ENSG00000146648\"): gene, description, protein class, biological process, molecular function, RNA tissue specificity/distribution, subcellular location, and disease involvement. Use search_genes to find the Ensembl id. Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        ensembl_id: { type: 'string', description: 'An Ensembl gene id like "ENSG00000146648".' },
      },
      required: ['ensembl_id'],
    },
  },
  {
    name: 'top_tissues',
    description:
      'List a protein\'s top-expressing human tissues by RNA expression (nTPM), highest first, for one Ensembl gene id. Use search_genes to find the Ensembl id. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        ensembl_id: { type: 'string', description: 'An Ensembl gene id like "ENSG00000146648".' },
        limit: { type: 'number', description: 'Max tissues to return (default 10).' },
      },
      required: ['ensembl_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_genes':
        return await searchGenes(args);
      case 'get_protein':
        return await getProtein(args);
      case 'top_tissues':
        return await topTissues(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchGenes(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query');
  const limit = numArg(args.limit, 15);
  const url = `${BASE}/api/search_download.php?search=${encodeURIComponent(query)}&format=json&columns=g,gs,eg,gd&compress=no`;
  const data = await fetchJson(url);
  const rows = Array.isArray(data) ? data : [];
  const genes = rows.slice(0, limit).map((g: any) => ({
    gene: g.Gene,
    ensembl: g.Ensembl,
    synonyms: g['Gene synonym'],
    description: g['Gene description'],
  }));
  return { count: genes.length, genes };
}

async function getProtein(args: Record<string, unknown>): Promise<unknown> {
  const ensemblId = reqStr(args, 'ensembl_id');
  const url = `${BASE}/${encodeURIComponent(ensemblId)}.json`;
  let d: any;
  try {
    d = await fetchJson(url);
  } catch {
    return { error: 'protein not found', ensembl_id: ensemblId };
  }
  if (!d || typeof d !== 'object') return { error: 'protein not found', ensembl_id: ensemblId };
  return {
    gene: d.Gene,
    ensembl: d.Ensembl,
    description: d['Gene description'],
    protein_class: d['Protein class'],
    biological_process: d['Biological process'],
    molecular_function: d['Molecular function'],
    rna_tissue_specificity: d['RNA tissue specificity'],
    rna_tissue_distribution: d['RNA tissue distribution'],
    subcellular_location: d['Subcellular main location'] ?? d['Subcellular location'],
    disease_involvement: d['Disease involvement'],
  };
}

async function topTissues(args: Record<string, unknown>): Promise<unknown> {
  const ensemblId = reqStr(args, 'ensembl_id');
  const limit = numArg(args.limit, 10);
  const url = `${BASE}/${encodeURIComponent(ensemblId)}.json`;
  let d: any;
  try {
    d = await fetchJson(url);
  } catch {
    return { ensembl_id: ensemblId, tissues: [] };
  }
  const ntpm = d?.['RNA tissue specific nTPM'];
  if (!ntpm || typeof ntpm !== 'object') return { ensembl_id: ensemblId, tissues: [] };
  const tissues = Object.entries(ntpm as Record<string, unknown>)
    .map(([tissue, value]) => ({ tissue, nTPM: Number(value) }))
    .sort((a, b) => b.nTPM - a.nTPM)
    .slice(0, limit);
  return { ensembl_id: ensemblId, gene: d.Gene, tissues };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HPA: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing.`);
  return v;
}

function numArg(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
