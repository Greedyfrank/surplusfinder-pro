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

export const recordIdentityKey = (record) => {
  const caseNumber = `${record.case_number || ""}`.trim().toLowerCase();
  if (caseNumber) return `case:${caseNumber}`;

  const parcel = `${record.parcel_apn || ""}`.trim().toLowerCase();
  const state = `${record.state || ""}`.trim().toLowerCase();
  if (parcel && state) return `parcel:${state}:${parcel}`;

  return [
    "owner",
    `${record.owner_name || ""}`.trim().toLowerCase(),
    `${record.county || ""}`.trim().toLowerCase(),
    `${record.state || ""}`.trim().toLowerCase(),
    `${record.surplus_amount || 0}`,
  ].join(":");
};

export const dedupeRecords = (records) => {
  const seen = new Set();
  return records.filter((record) => {
    const key = recordIdentityKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
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
