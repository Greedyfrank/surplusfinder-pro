import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None


STATUS_ALIASES = {
    "new lead": "new_lead",
    "needs verification": "needs_verification",
    "contacted": "contacted",
    "responded": "responded",
    "documents sent": "documents_sent",
    "agreement signed": "agreement_signed",
    "submitted to county": "submitted_to_county",
    "paid": "paid",
    "closed": "closed",
    "do not contact": "do_not_contact",
}

LABEL_ALIASES = {
    "hot lead": "hot_lead",
    "strong lead": "strong_lead",
    "needs research": "needs_research",
    "low priority": "low_priority",
    "compliance review": "compliance_review",
}

OUTPUT_FIELDS = [
    "owner_name",
    "state",
    "county",
    "property_address",
    "parcel_apn",
    "surplus_amount",
    "sale_date",
    "case_number",
    "source_url",
    "status",
    "deal_score",
    "deal_label",
    "record_type",
    "notes",
]


def normalize_header(value):
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def first(row, keys):
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def parse_money(value):
    cleaned = str(value or "").replace("$", "").replace(",", "").strip()
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return 0


def normalize_date(value):
    raw = str(value or "").strip()
    if not raw or raw.upper() == "N/A":
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    for fmt in ("%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return raw


def normalize_owner(value):
    return re.sub(r"\s+", " ", str(value or "").lstrip(". ").strip())


def title_case_owner(value):
    text = normalize_owner(value).lower()
    text = re.sub(r"\b([a-z])", lambda m: m.group(1).upper(), text)
    return text.replace(" Etal", " ETAL").replace(" Aka ", " aka ")


def normalize_status(value):
    key = str(value or "").strip().lower().replace("_", " ").replace("-", " ")
    return STATUS_ALIASES.get(key, "new_lead")


def normalize_label(value):
    key = str(value or "").strip().lower().replace("_", " ").replace("-", " ")
    return LABEL_ALIASES.get(key, "")


def score_record(record):
    score = 0
    amount = float(record.get("surplus_amount") or 0)
    if amount >= 50000:
        score += 25
    elif amount >= 20000:
        score += 20
    elif amount >= 10000:
        score += 15
    elif amount >= 5000:
        score += 10
    elif amount >= 1000:
        score += 5

    score += 8  # neutral compliance score

    if record.get("sale_date"):
        try:
            days_since_sale = (datetime.now().date() - datetime.fromisoformat(record["sale_date"]).date()).days
            if days_since_sale <= 90:
                score += 15
            elif days_since_sale <= 180:
                score += 12
            elif days_since_sale <= 365:
                score += 8
            elif days_since_sale <= 730:
                score += 4
        except ValueError:
            pass

    if record.get("status") == "new_lead":
        score += 3

    score = max(0, min(100, score))
    if score >= 75:
        label = "hot_lead"
    elif score >= 55:
        label = "strong_lead"
    elif score >= 35:
        label = "needs_research"
    else:
        label = "low_priority"
    return score, label


def map_csv_row(row):
    owner_name = normalize_owner(first(row, ["owner_name", "owner_candidate", "owner", "claimant_name", "name"]))
    state = first(row, ["state"]).upper()
    county = re.sub(r"\s+county$", " County", first(row, ["county"]), flags=re.I)
    source_file = first(row, ["source_file"])
    deal_score_raw = first(row, ["deal_score", "lead_score", "score"])

    record = {
        "owner_name": owner_name,
        "state": state,
        "county": county,
        "property_address": first(row, ["property_address", "address", "situs_address"]),
        "parcel_apn": first(row, ["parcel_apn", "parcel_number", "apn", "property_id"]),
        "surplus_amount": parse_money(first(row, ["surplus_amount", "excess_funds", "amount", "funds"])),
        "sale_date": normalize_date(first(row, ["sale_date", "date_of_sale"])),
        "case_number": first(row, ["case_number", "case_no", "case"]),
        "source_url": first(row, ["source_url", "url"]),
        "status": normalize_status(first(row, ["status"])),
        "deal_score": int(float(deal_score_raw)) if deal_score_raw else "",
        "deal_label": normalize_label(first(row, ["deal_label", "lead_priority"])),
        "record_type": "tax_sale",
        "notes": "\n".join(filter(None, [first(row, ["data_quality_notes"]), f"Source file: {source_file}" if source_file else ""])),
    }

    if not record["deal_score"] or not record["deal_label"]:
        score, label = score_record(record)
        record["deal_score"] = record["deal_score"] or score
        record["deal_label"] = record["deal_label"] or label
    return record


def read_csv_records(path):
    with Path(path).open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = [
            {normalize_header(key): value for key, value in row.items()}
            for row in reader
        ]
    return [map_csv_row(row) for row in rows]


def extract_owner_from_style(style):
    cleaned = re.sub(r"\s+", " ", style).strip()
    cleaned = re.sub(r"\s+(SHERIFF|CITY OF [A-Z ]+|CONSTABLE|TAX OFFICE)\s*$", "", cleaned, flags=re.I)
    match = re.search(r"\bvs\.?\s+(.+)$", cleaned, flags=re.I)
    if match:
        return title_case_owner(match.group(1))
    match = re.search(r"\bet al\s+(.+)$", cleaned, flags=re.I)
    if match:
        return title_case_owner(match.group(1))
    return title_case_owner(cleaned)


def parse_pdf_text(text, source_name):
    records = []
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            continue

        piped = line.split("|")
        if re.match(r"^[A-Z]{2}-\d{2}-\d{5}\s*$", piped[0].strip()) and len(piped) >= 8:
            parts = [part.strip() for part in piped]
            dollar_index = parts.index("$") if "$" in parts else -1
            amount = parts[dollar_index + 1] if dollar_index >= 0 and dollar_index + 1 < len(parts) else parts[4]
            sale_date = parts[dollar_index + 4] if dollar_index >= 0 and dollar_index + 4 < len(parts) else ""
            records.append(pdf_record(parts[0], parts[1], amount, sale_date, source_name))
            continue

        match = re.match(r"^([A-Z]{2}-\d{2}-\d{5})\s+(.+?)\s+([\d,]+\.\d{2})\$\s+(.+)$", line)
        if match:
            dates = re.findall(r"\d{1,2}/\d{1,2}/\d{4}|N/A", match.group(4))
            sale_date = dates[2] if len(dates) >= 3 else ""
            records.append(pdf_record(match.group(1), match.group(2), match.group(3), sale_date, source_name))
    return records


def pdf_record(case_number, style, amount, sale_date, source_name):
    record = {
        "owner_name": extract_owner_from_style(style),
        "state": "TX",
        "county": "Dallas County",
        "property_address": "",
        "parcel_apn": "",
        "surplus_amount": parse_money(amount),
        "sale_date": normalize_date(sale_date),
        "case_number": case_number.strip(),
        "source_url": "",
        "status": "new_lead",
        "deal_score": "",
        "deal_label": "",
        "record_type": "tax_sale",
        "notes": f"Imported from PDF: {source_name}",
    }
    score, label = score_record(record)
    record["deal_score"] = score
    record["deal_label"] = label
    return record


def read_pdf_records(path):
    if PdfReader is None:
        raise RuntimeError("pypdf is required for PDF imports. Install it with: pip install pypdf")
    reader = PdfReader(str(path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return parse_pdf_text(text, Path(path).name)


def dedupe_records(records):
    seen = set()
    unique = []
    for record in records:
        key = (
            record.get("case_number", "").lower(),
            record.get("owner_name", "").lower(),
            record.get("surplus_amount", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    return unique


def write_csv(records, path):
    with Path(path).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(records)


def write_json(records, path):
    Path(path).write_text(json.dumps(records, indent=2), encoding="utf-8")


def run_pipeline(inputs, output_csv, output_json=None):
    records = []
    for input_path in inputs:
        path = Path(input_path)
        if not path.exists():
            raise FileNotFoundError(path)
        if path.suffix.lower() == ".csv":
            parsed = read_csv_records(path)
        elif path.suffix.lower() == ".pdf":
            parsed = read_pdf_records(path)
        else:
            print(f"Skipping unsupported file: {path}")
            continue
        valid = [record for record in parsed if record["owner_name"] and record["state"] and record["county"]]
        print(f"{path.name}: parsed {len(parsed)}, valid {len(valid)}")
        records.extend(valid)

    records = dedupe_records(records)
    write_csv(records, output_csv)
    if output_json:
        write_json(records, output_json)
    print(f"Wrote {len(records)} app-ready records to {output_csv}")
    return records


def main():
    parser = argparse.ArgumentParser(description="Normalize surplus PDF/CSV files into app-ready import records.")
    parser.add_argument("inputs", nargs="*", default=["ExcessFunds-040126.pdf", "dallas_county_excess_funds_full_scored.csv"])
    parser.add_argument("--output-csv", default="surplus_master.csv")
    parser.add_argument("--output-json", default="")
    args = parser.parse_args()
    run_pipeline(args.inputs, args.output_csv, args.output_json or None)


if __name__ == "__main__":
    main()
