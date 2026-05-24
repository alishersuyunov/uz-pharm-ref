# uz-pharm-ref

An MCP server for querying Uzbekistan pharmaceutical reference prices via the [pharmagency.uz](https://uzpharmagency.uz) public API.

## Tools

| Tool | Description |
|---|---|
| `search_drugs` | Search drugs by name (trademark or INN), with optional date and pagination |
| `get_drug_details` | Get full details for a drug by its ID — prices, ATC code, dosage form, images |

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later — check with `node --version`
- [Claude Code](https://claude.ai/code) installed and running

## Installation

**1. Clone the repo and enter the directory**

```bash
git clone https://github.com/your-username/uz-pharm-ref.git
cd uz-pharm-ref
```

**2. Install dependencies**

```bash
npm install
```

**3. Build the server**

```bash
npm run build
```

This compiles the TypeScript source into `dist/index.js`, which is what Claude actually runs.

## Connecting to Claude Code

**Option A — Per-project (automatic)**

Copy `.mcp.json.example` to `.mcp.json` and replace the placeholder path with your own absolute path to `dist/index.js`:

```bash
cp .mcp.json.example .mcp.json
# then edit .mcp.json and set the correct path
```

`.mcp.json` is intentionally git-ignored because it contains a machine-specific absolute path.

**Option B — Global (available in all projects)**

Run `/mcp` inside Claude Code, choose **Add server → stdio**, and fill in:

| Field | Value |
|---|---|
| Name | `uz-pharm-ref` |
| Command | `node` |
| Arguments | `/full/path/to/uz-pharm-ref/dist/index.js` |

Use the **full absolute path** to `dist/index.js` — not a relative one. Claude Code does not set the working directory for MCP processes, so relative paths like `dist/index.js` will fail.

- Windows example: `C:\Users\you\uz-pharm-ref\dist\index.js`
- Linux/macOS example: `/home/you/uz-pharm-ref/dist/index.js`

After adding the server, restart Claude Code. You should see `uz-pharm-ref` listed under active MCP servers.

## Example prompts

> What is the reference price for Цералин as of today?

> Search for paracetamol drugs and show me the cheapest option.

> Get full details for drug ID 1720405.

## Data

Prices are sourced from the Uzbekistan Ministry of Health referent price registry. Results include:

- Price in USD (reference/ceiling price)
- Wholesale and retail prices in UZS
- INN name, ATC code, dosage form, manufacturer, registration number
- Prescription status and VAT indicator
