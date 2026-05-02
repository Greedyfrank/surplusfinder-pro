import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

export const RECORD_PAGE_LIMIT = 500;

export const listSurplusRecords = async () => {
  const records = [];
  let page = 0;

  while (true) {
    const batch = await base44.entities.SurplusRecord.list(
      "-created_date",
      RECORD_PAGE_LIMIT,
      page * RECORD_PAGE_LIMIT
    );
    records.push(...batch);
    if (batch.length < RECORD_PAGE_LIMIT) break;
    page += 1;
  }

  return records;
};

export const getSurplusRecordById = (id) =>
  base44.entities.SurplusRecord.get(id);

export const formatRecordDate = (value, pattern = "MMM d, yyyy") => {
  if (!value) return "";
  const raw = `${value}`;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : format(date, pattern);
};

const normalizeIdentityText = (value) =>
  `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(county|co)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeIdentityNumber = (value) =>
  `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeMoneyIdentity = (value) => {
  const parsed = Number(`${value || 0}`.replace?.(/[$,]/g, "") ?? value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const parseMoneyIdentity = (value) => {
  const parsed = Number(`${value || 0}`.replace?.(/[$,]/g, "") ?? value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const addKey = (keys, key, requiredParts) => {
  if (requiredParts.every(Boolean)) keys.push(key);
};

export const recordIdentityKeys = (record) => {
  const keys = [];
  const state = normalizeIdentityText(record.state);
  const county = normalizeIdentityText(record.county);
  const owner = normalizeIdentityText(record.owner_name);
  const address = normalizeIdentityText(record.property_address);
  const caseNumber = normalizeIdentityNumber(record.case_number);
  const parcel = normalizeIdentityNumber(record.parcel_apn);
  const sourceUrl = `${record.source_url || ""}`.trim().toLowerCase();
  const amountValue = parseMoneyIdentity(record.surplus_amount);
  const amount = normalizeMoneyIdentity(record.surplus_amount);

  addKey(keys, `case:${state}:${caseNumber}`, [state, caseNumber]);
  addKey(keys, `case:${county}:${state}:${caseNumber}`, [county, state, caseNumber]);
  addKey(keys, `parcel:${state}:${parcel}`, [state, parcel]);
  addKey(keys, `parcel:${county}:${state}:${parcel}`, [county, state, parcel]);
  addKey(keys, `source:${sourceUrl}`, [sourceUrl]);
  addKey(keys, `property:${owner}:${address}:${county}:${state}`, [owner, address, county, state]);
  addKey(keys, `owner:${owner}:${county}:${state}:${amount}`, [owner, county, state, amountValue > 0]);

  return [...new Set(keys)];
};

export const recordIdentityKey = (record) =>
  recordIdentityKeys(record)[0] || `record:${JSON.stringify(record)}`;

export const addRecordIdentityKeys = (keySet, record) => {
  recordIdentityKeys(record).forEach((key) => keySet.add(key));
};

export const dedupeRecords = (records) => {
  const seen = new Set();
  return records.filter((record) => {
    const keys = recordIdentityKeys(record);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
};

export const getTemplateFields = (record = {}, settings = {}, contact = {}) => ({
  "[Owner Name]": record.owner_name || "",
  "[Owner Address]": contact.mailing_address || "",
  "[Property Address]": record.property_address || `${record.county || ""}${record.county && record.state ? ", " : ""}${record.state || ""}`,
  "[County]": record.county || "",
  "[State]": record.state || "",
  "[Parcel/APN]": record.parcel_apn || "",
  "[Sale Date]": formatRecordDate(record.sale_date, "MMMM d, yyyy"),
  "[Surplus Amount]": record.surplus_amount || record.surplus_amount === 0 ? `$${Number(record.surplus_amount).toLocaleString()}` : "",
  "[Case Number]": record.case_number || "",
  "[Company]": settings.company_name || "",
  "[User Name]": settings.user_name || "",
  "[Phone]": settings.phone || "",
  "[Email]": settings.email || "",
  "[Website]": settings.website || "",
  "[Date]": format(new Date(), "MMMM d, yyyy"),
});

export const fillTemplate = (template, record, settings, contact) => {
  let text = template || "";
  Object.entries(getTemplateFields(record, settings, contact)).forEach(([key, value]) => {
    text = text.replace(new RegExp(key.replace(/[[\]]/g, "\\$&"), "g"), value || "_______________");
  });
  return text;
};
