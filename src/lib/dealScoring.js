export function calculateDealScore(record, contacts = [], complianceRule = null) {
  let score = 0;

  // Surplus amount (0-25 points)
  const amount = record.surplus_amount || 0;
  if (amount >= 50000) score += 25;
  else if (amount >= 20000) score += 20;
  else if (amount >= 10000) score += 15;
  else if (amount >= 5000) score += 10;
  else if (amount >= 1000) score += 5;

  // Contact confidence (0-20 points)
  const maxConfidence = contacts.length > 0
    ? Math.max(...contacts.map(c => c.confidence_score || 0))
    : 0;
  score += Math.round(maxConfidence * 0.2);

  // Number of verified contacts (0-15 points)
  const verifiedContacts = contacts.filter(c => c.confidence_score >= 50).length;
  if (verifiedContacts >= 3) score += 15;
  else if (verifiedContacts >= 2) score += 10;
  else if (verifiedContacts >= 1) score += 7;

  // Compliance complexity (0-15 points) - lower complexity = higher score
  if (complianceRule) {
    if (complianceRule.compliance_complexity === "low") score += 15;
    else if (complianceRule.compliance_complexity === "medium") score += 10;
    else score += 3;
  } else {
    score += 8; // neutral if unknown
  }

  // Record age (0-15 points)
  if (record.sale_date) {
    const saleDate = /^\d{4}-\d{2}-\d{2}$/.test(record.sale_date)
      ? new Date(`${record.sale_date}T00:00:00`)
      : new Date(record.sale_date);
    const daysSinceSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSale <= 90) score += 15;
    else if (daysSinceSale <= 180) score += 12;
    else if (daysSinceSale <= 365) score += 8;
    else if (daysSinceSale <= 730) score += 4;
  }

  // Recovery likelihood (0-10 points)
  if (record.status === "responded") score += 10;
  else if (record.status === "contacted") score += 5;
  else if (record.status === "new_lead") score += 3;

  score = Math.min(100, Math.max(0, score));

  let label;
  if (score >= 75) label = "hot_lead";
  else if (score >= 55) label = "strong_lead";
  else if (score >= 35) label = "needs_research";
  else label = "low_priority";

  if (complianceRule && !complianceRule.third_party_recovery_legal) {
    label = "compliance_review";
  }

  return { score, label };
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];
