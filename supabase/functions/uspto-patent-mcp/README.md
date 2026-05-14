# USPTO Patent MCP Server

Model Context Protocol server for accessing the United States Patent and Trademark Office database.

## Features

- **Patent Search**: Advanced CQL queries across 11M+ patents
- **Full Text**: Complete patent documents (abstract, claims, description)
- **PDF Downloads**: Get patents as base64-encoded PDFs
- **Portfolio Analysis**: Inventor and company patent portfolios
- **Classification Search**: CPC/IPC classification searches
- **Prior Art Search**: Assistance formulating prior art queries

## MCP Methods

- `initialize` - Server info and capabilities
- `tools/list` - List all USPTO tools
- `tools/call` - Execute patent searches and retrievals
- `resources/list` - List available USPTO resources
- `resources/read` - Access USPTO data resources
- `prompts/list` - List patent search prompts
- `prompts/get` - Generate search query prompts

## Tools

### search_patents
Search USPTO database with CQL syntax.

**CQL Syntax Guide:**
- `TTL/keyword` - Title search
- `ABST/keyword` - Abstract search
- `ACLM/keyword` - Claims search
- `IN/name` - Inventor name
- `AN/company` - Assignee/company
- `ISD/YYYYMMDD` - Issue date
- `CPC/classification` - CPC class

**Examples:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "search_patents",
    "arguments": {
      "query": "TTL/artificial intelligence AND ISD/20240101->20241231",
      "rows": 25
    }
  }
}
```

### get_patent_fulltext
Get complete patent text by number.

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_patent_fulltext",
    "arguments": {
      "patent_number": "11234567"
    }
  }
}
```

### download_patent_pdf
Download patent as base64 PDF.

```json
{
  "method": "tools/call",
  "params": {
    "name": "download_patent_pdf",
    "arguments": {
      "patent_number": "11234567"
    }
  }
}
```

### search_by_inventor
Find all patents by inventor name.

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_by_inventor",
    "arguments": {
      "inventor_name": "Geoffrey Hinton",
      "date_from": "20200101"
    }
  }
}
```

### search_by_assignee
Find all patents by company/assignee.

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_by_assignee",
    "arguments": {
      "assignee_name": "Google",
      "date_from": "20240101"
    }
  }
}
```

### search_by_classification
Find patents by CPC classification.

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_by_classification",
    "arguments": {
      "cpc_code": "G06N3/08"
    }
  }
}
```

## Resources

- `uspto://recent-patents` - Last 30 days
- `uspto://patent/{number}` - Specific patent
- `uspto://inventor/{name}/patents` - Inventor portfolio
- `uspto://assignee/{name}/patents` - Company portfolio
- `uspto://classification/{cpc}/patents` - CPC patents

## Prompts

- `patent_search_assistant` - Help formulate CQL queries
- `prior_art_search` - Search for prior art
- `competitive_analysis` - Analyze competitor portfolios
- `technology_landscape` - Map technology trends

## External Access

Connect Claude Desktop, Cursor, or VS Code:

```json
{
  "mcpServers": {
    "uspto-patent": {
      "url": "https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/uspto-patent-mcp"
    }
  }
}
```

## Integration with Eliza

Eliza can search USPTO patents directly:

**User:** "Find AI patents from Google in 2024"
**Eliza:** *calls search_uspto_patents tool*
**Eliza:** "I found 47 patents from Google about AI in 2024..."

## Rate Limits

- Public Search API: 10 req/sec (no key required)
- PDF Downloads: 5/min (large payloads)

## Cost

FREE - All public APIs, no API key required.
