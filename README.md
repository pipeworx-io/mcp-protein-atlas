# mcp-protein-atlas

Human Protein Atlas (HPA) MCP — keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_genes` | Search the Human Protein Atlas for human genes/proteins by gene symbol or keyword. Returns each gene with its Ensembl gene id (needed by get_protein and top_tissues), synonyms, and description. Keyless. |
| `get_protein` | Get a trimmed Human Protein Atlas profile for one protein by Ensembl gene id (e.g. "ENSG00000146648"): gene, description, protein class, biological process, molecular function, RNA tissue specificity/distribution, subcellular location, and disease involvement. Use search_genes to find the Ensembl id. Keyless. |
| `top_tissues` | List a protein's top-expressing human tissues by RNA expression (nTPM), highest first, for one Ensembl gene id. Use search_genes to find the Ensembl id. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "protein-atlas": {
      "url": "https://gateway.pipeworx.io/protein-atlas/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Protein Atlas data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
