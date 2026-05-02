const STATUS_ALIASES = {
  "new lead": "new_lead",
  "needs verification": "needs_verification",
  contacted: "contacted",
  responded: "responded",
  "documents sent": "documents_sent",
  "agreement signed": "agreement_signed",
  "submitted to county": "submitted_to_county",
  paid: "paid",
  closed: "closed",
  "do not contact": "do_not_contact",
};

const LABEL_ALIASES = {
  "hot lead": "hot_lead",
  "strong lead": "strong_lead",
  "needs research": "needs_research",
  "low priority": "low_priority",
  "compliance review": "compliance_review",
};

const getFirst = (row, keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return `${value}`.trim();
    }
  }
  return "";
};

export const normalizeHeader = (header) =>
  `${header || ""}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const parseMoney = (value) => {
  const cleaned = `${value || ""}`.replace(/[$,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeDate = (value) => {
  const raw = `${value || ""}`.trim();
  if (!raw || raw.toUpperCase() === "N/A") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return raw;

  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const normalizeOwnerName = (value) =>
  `${value || ""}`.replace(/^[.\s]+/, "").replace(/\s+/g, " ").trim();

export const normalizeStatus = (value) => {
  const key = `${value || ""}`.trim().toLowerCase().replace(/[_-]+/g, " ");
  return STATUS_ALIASES[key] || "new_lead";
};

export const normalizeDealLabel = (value, fallback = "") => {
  const key = `${value || ""}`.trim().toLowerCase().replace(/[_-]+/g, " ");
  return LABEL_ALIASES[key] || fallback;
};

export const parseCsvText = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] || "";
    });
    return record;
  });
};

export const mapCsvRowToSurplusRecord = (row) => {
  const ownerName = normalizeOwnerName(getFirst(row, ["owner_name", "owner_candidate", "owner", "claimant_name", "name"]));
  const state = getFirst(row, ["state"]).toUpperCase();
  const county = getFirst(row, ["county"]).replace(/\s+county$/i, " County");
  const surplusAmount = parseMoney(getFirst(row, ["surplus_amount", "excess_funds", "amount", "funds"]));
  const leadScore = parseFloat(getFirst(row, ["deal_score", "lead_score", "score"]));
  const sourceFile = getFirst(row, ["source_file"]);

  return {
    owner_name: ownerName,
    state,
    county,
    property_address: getFirst(row, ["property_address", "address", "situs_address"]),
    parcel_apn: getFirst(row, ["parcel_apn", "parcel_number", "apn", "property_id"]),
    surplus_amount: surplusAmount,
    sale_date: normalizeDate(getFirst(row, ["sale_date", "date_of_sale"])),
    case_number: getFirst(row, ["case_number", "case_no", "case"]),
    source_url: getFirst(row, ["source_url", "url"]),
    status: normalizeStatus(getFirst(row, ["status"])),
    deal_score: Number.isFinite(leadScore) ? leadScore : undefined,
    deal_label: normalizeDealLabel(getFirst(row, ["deal_label", "lead_priority"])),
    record_type: "tax_sale",
    notes: [getFirst(row, ["data_quality_notes"]), sourceFile ? `Source file: ${sourceFile}` : ""]
      .filter(Boolean)
      .join("\n"),
  };
};

const titleCase = (value) =>
  `${value || ""}`
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\bEtal\b/g, "ETAL")
    .replace(/\bAka\b/g, "aka");

const extractOwnerFromStyle = (style) => {
  const cleaned = style
    .replace(/\s+(SHERIFF|CITY OF [A-Z ]+|CONSTABLE|TAX OFFICE)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const vsMatch = cleaned.match(/\bvs\.?\s+(.+)$/i);
  if (vsMatch) return titleCase(normalizeOwnerName(vsMatch[1]));
  const etAlMatch = cleaned.match(/\bet al\s+(.+)$/i);
  if (etAlMatch) return titleCase(normalizeOwnerName(etAlMatch[1]));
  return titleCase(normalizeOwnerName(cleaned));
};

export const parseSurplusRecordsFromPdfText = (text, defaults = {}) => {
  const records = [];
  const lines = `${text || ""}`
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^[A-Z]{2}-\d{2}-\d{5}\s*\|/.test(line)) {
      const parts = line.split("|").map((part) => part.trim());
      const [caseNumber, style] = parts;
      const dollarIndex = parts.indexOf("$");
      const amountText = dollarIndex >= 0 ? parts[dollarIndex + 1] : parts[3];
      const saleDate = dollarIndex >= 0 ? parts[dollarIndex + 4] : parts[6];

      records.push({
        owner_name: extractOwnerFromStyle(style),
        county: defaults.county || "Dallas County",
        state: defaults.state || "TX",
        case_number: caseNumber,
        surplus_amount: parseMoney(amountText),
        sale_date: normalizeDate(saleDate),
        record_type: "tax_sale",
        status: "new_lead",
        notes: "Imported from PDF text extraction",
      });
      continue;
    }

    const match = line.match(/^([A-Z]{2}-\d{2}-\d{5})\s+(.+?)\s+([\d,]+\.\d{2})\$\s+(.+)$/);
    if (!match) continue;

    const [, caseNumber, style, amountText, tail] = match;
    const dates = tail.match(/(\d{1,2}\/\d{1,2}\/\d{4}|N\/A)/g) || [];
    const saleDate = dates.length >= 3 ? normalizeDate(dates[2]) : "";

    records.push({
      owner_name: extractOwnerFromStyle(style),
      county: defaults.county || "Dallas County",
      state: defaults.state || "TX",
      case_number: caseNumber,
      surplus_amount: parseMoney(amountText),
      sale_date: saleDate,
      record_type: "tax_sale",
      status: "new_lead",
      notes: "Imported from PDF text extraction",
    });
  }

  return records;
};
