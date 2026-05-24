import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = "https://api.pharmagency.uz";

const HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  lang: "uz",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface DrugSummary {
  uuid: string;
  drugId: number;
  trademark: string;
  innName: string;
  manufacturer: string;
  medicinalProductIncludingPackaging: string;
  registrationNumber: string;
  currency: string;
  price: number;
  wholesalePrice: number;
  retailPrice: number;
  basePrice: number;
  vatEnabled: string;
  imgUrl: string | null;
  prescription: string;
  local: boolean;
  uploadedAt: string;
}

interface SearchResult {
  content: DrugSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

interface DrugDetail {
  id: number;
  shortName: string;
  fullName: string;
  retailPrice: number;
  wholeSalePrice: number;
  maxSalePrice: number;
  retailPriceBase: number | null;
  wholeSalePriceBase: number | null;
  maxSalePriceBase: number | null;
  currency: string;
  priceDate: string;
  innNames: string;
  atcCode: string;
  dosageForm: string;
  strength: string;
  country: string;
  manufacturer: string;
  registrationNumber: string;
  local: boolean;
  imgUrls: string[];
  imgUrl: string | null;
  totalCountInPackage: number | null;
  withoutPrescription: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { success: boolean; result: T };
  if (!json.success) {
    throw new Error("API returned success=false");
  }
  return json.result;
}

function formatDrugSummary(d: DrugSummary): string {
  return [
    `**${d.trademark}** (ID: ${d.drugId})`,
    `INN: ${d.innName}`,
    `Form: ${d.medicinalProductIncludingPackaging}`,
    `Manufacturer: ${d.manufacturer}`,
    `Registration: ${d.registrationNumber}`,
    `Price (USD): ${d.price} | Wholesale (UZS): ${d.wholesalePrice.toLocaleString()} | Retail (UZS): ${d.retailPrice.toLocaleString()}`,
    `VAT: ${d.vatEnabled} | Prescription: ${d.prescription}`,
    `Local: ${d.local ? "Yes" : "No"} | Uploaded: ${d.uploadedAt}`,
    d.imgUrl ? `Image: ${d.imgUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDrugDetail(d: DrugDetail): string {
  return [
    `**${d.shortName}** (ID: ${d.id})`,
    `Full name: ${d.fullName}`,
    `INN: ${d.innNames} | ATC: ${d.atcCode}`,
    `Dosage form: ${d.dosageForm} | Strength: ${d.strength}`,
    `Country: ${d.country} | Manufacturer: ${d.manufacturer}`,
    `Registration: ${d.registrationNumber}`,
    `Currency: ${d.currency} | Price date: ${d.priceDate}`,
    `Max sale price: ${d.maxSalePrice} | Wholesale: ${d.wholeSalePrice} | Retail: ${d.retailPrice}`,
    d.maxSalePriceBase != null ? `Base prices — Max: ${d.maxSalePriceBase} | Wholesale: ${d.wholeSalePriceBase} | Retail: ${d.retailPriceBase}` : "",
    `Local: ${d.local ? "Yes" : "No"} | Prescription required: ${d.withoutPrescription ? "No" : "Yes"}`,
    d.totalCountInPackage != null ? `Units per package: ${d.totalCountInPackage}` : "",
    d.imgUrls?.length ? `Images (${d.imgUrls.length}): ${d.imgUrls[0]}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "uz-pharm-ref",
  version: "1.0.0",
});

server.tool(
  "search_drugs",
  "Search Uzbekistan pharmaceutical reference prices by drug name (trademark or INN). Returns paginated results with prices in USD and UZS.",
  {
    drugName: z.string().describe("Drug name to search for (partial match on trademark or INN name)"),
    date: z
      .string()
      .optional()
      .describe("Reference price date in DD.MM.YYYY format. Defaults to today."),
    page: z.number().int().min(0).default(0).describe("Page number (0-based)"),
    size: z.number().int().min(1).max(100).default(20).describe("Page size"),
  },
  async ({ drugName, date, page, size }) => {
    const priceDate = date ?? formatDate(new Date());
    const result = await apiFetch<SearchResult>("/drug-catalog-api/v1/referent-price/all", {
      date: priceDate,
      drugNameLike: drugName,
      page: String(page),
      size: String(size),
    });

    if (result.totalElements === 0) {
      return {
        content: [{ type: "text", text: `No drugs found matching "${drugName}" on ${priceDate}.` }],
      };
    }

    const header = `Found ${result.totalElements} result(s) for "${drugName}" (page ${result.number + 1}/${result.totalPages}, date: ${priceDate})\n\n`;
    const body = result.content.map(formatDrugSummary).join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: header + body }],
    };
  }
);

server.tool(
  "get_drug_details",
  "Get detailed information for a specific drug by its ID, including full pricing breakdown, ATC code, dosage form, and all available images.",
  {
    drugId: z.number().int().positive().describe("Drug ID (drugId from search_drugs results)"),
  },
  async ({ drugId }) => {
    const detail = await apiFetch<DrugDetail>(`/drug-catalog-api/v2/referent-price/${drugId}`);
    return {
      content: [{ type: "text", text: formatDrugDetail(detail) }],
    };
  }
);

// ── Entry point ───────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
