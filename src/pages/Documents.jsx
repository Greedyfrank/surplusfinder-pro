import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Printer, ClipboardList, Shield, UserCheck, FileCheck, Building2, Briefcase } from "lucide-react";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { formatCurrency } from "@/lib/dealScoring";
import { formatRecordDate, listSurplusRecords } from "@/lib/records";
import { format } from "date-fns";

const documentTypes = [
  { id: "owner_info", label: "Owner Information Form", icon: UserCheck, desc: "Basic owner and property info" },
  { id: "intake", label: "Surplus Recovery Intake Form", icon: ClipboardList, desc: "Full intake with case details" },
  { id: "agreement", label: "Recovery Services Agreement", icon: FileCheck, desc: "Service agreement with fee structure" },
  { id: "disclosure", label: "Disclosure Statement", icon: Shield, desc: "Required compliance disclosures" },
  { id: "authorization", label: "Authorization Form", icon: FileText, desc: "Authorization to act on behalf" },
  { id: "agent_agreement", label: "Third-Party Recovery Agent Agreement", icon: FileCheck, desc: "Detailed finder/agent agreement" },
  { id: "fee_disclosure", label: "Fee and No-Government-Affiliation Disclosure", icon: Shield, desc: "Client fee acknowledgment" },
  { id: "limited_poa", label: "Limited Power of Attorney Review Form", icon: FileText, desc: "Attorney-reviewed authority form" },
  { id: "cancellation_notice", label: "Right to Cancel Notice", icon: Shield, desc: "Client cancellation notice" },
  { id: "claimant_affidavit", label: "Claimant Verification Affidavit", icon: UserCheck, desc: "Identity and ownership attestation" },
  { id: "agent_compliance_checklist", label: "Agent Compliance Checklist", icon: ClipboardList, desc: "State and county review checklist" },
  { id: "official_source_checklist", label: "Official Source Checklist", icon: Building2, desc: "Government-source verification log" },
  { id: "checklist", label: "Claim Packet Checklist", icon: ClipboardList, desc: "County submission checklist" },
  { id: "cover_letter", label: "County Cover Letter", icon: Building2, desc: "Formal county submission letter" },
  { id: "case_summary", label: "Internal Case Summary", icon: Briefcase, desc: "Internal case overview report" },
];

function generateDocument(type, record, contacts, settings) {
  const date = format(new Date(), "MMMM d, yyyy");
  const contact = contacts?.[0] || {};
  const co = settings;

  const fields = {
    "[Owner Name]": record.owner_name || "_______________",
    "[Property Address]": record.property_address || "_______________",
    "[County]": record.county || "_______________",
    "[State]": record.state || "_______________",
    "[Parcel/APN]": record.parcel_apn || "_______________",
    "[Sale Date]": record.sale_date ? formatRecordDate(record.sale_date, "MMMM d, yyyy") : "_______________",
    "[Surplus Amount]": record.surplus_amount ? formatCurrency(record.surplus_amount) : "_______________",
    "[Case Number]": record.case_number || "_______________",
    "[Contact Phone]": contact.phone_numbers?.[0] || "_______________",
    "[Contact Email]": contact.emails?.[0] || "_______________",
    "[Contact Address]": contact.mailing_address || "_______________",
    "[Company]": co.company_name || "_______________",
    "[User Name]": co.user_name || "_______________",
    "[Company Phone]": co.phone || "_______________",
    "[Company Email]": co.email || "_______________",
    "[Website]": co.website || "_______________",
    "[Fee %]": co.fee_percent ? `${co.fee_percent}%` : "_______________",
    "[Agent Registration]": co.agent_registration_number || "_______________",
    "[Agent License]": co.agent_license_number || "_______________",
    "[Cancellation Days]": co.cancellation_period_days || "_______________",
    "[Date]": date,
  };

  const templates = {
    owner_info: `OWNER INFORMATION FORM\nDate: [Date]\n\nOwner Name: [Owner Name]\nMailing Address: [Contact Address]\nPhone: [Contact Phone]\nEmail: [Contact Email]\n\nProperty Address: [Property Address]\nCounty: [County], [State]\nParcel/APN: [Parcel/APN]\n\nSale Date: [Sale Date]\nSurplus Amount: [Surplus Amount]\nCase Number: [Case Number]`,
    intake: `SURPLUS RECOVERY INTAKE FORM\nDate: [Date]\n\n--- OWNER INFORMATION ---\nFull Name: [Owner Name]\nAddress: [Contact Address]\nPhone: [Contact Phone]\nEmail: [Contact Email]\n\n--- PROPERTY DETAILS ---\nProperty Address: [Property Address]\nCounty/State: [County], [State]\nParcel/APN: [Parcel/APN]\nSale Date: [Sale Date]\nSurplus Amount: [Surplus Amount]\nCase Number: [Case Number]\n\n--- RECOVERY SERVICE ---\nCompany: [Company]\nAgent: [User Name]\nService Fee: [Fee %] of recovered surplus\n\nNotes:\n_________________________________`,
    agreement: `RECOVERY SERVICES AGREEMENT\nDate: [Date]\n\nBETWEEN:\nClient: [Owner Name] ("Client")\nService Provider: [Company] ("Company")\n\n1. SERVICES\nCompany agrees to assist Client in recovering surplus funds from [County] County, [State], related to the property at [Property Address], Parcel/APN [Parcel/APN].\n\n2. ESTIMATED SURPLUS: [Surplus Amount]\n\n3. FEE STRUCTURE\nCompany shall receive [Fee %] of any successfully recovered surplus funds. Fee is only due upon successful recovery.\n\n4. IMPORTANT DISCLOSURES\n- Client may file a claim independently at no cost.\n- Company is NOT a government agency.\n- There is NO guarantee of recovery.\n- Company does not provide legal advice.\n\n5. CANCELLATION RIGHTS\nClient may cancel this agreement within the time period specified by applicable state law. Written notice required.\n\n6. NO GUARANTEE\nCompany makes no guarantees regarding the outcome of any claim.\n\nClient Signature: _______________________ Date: _________\n\nCompany Representative: _______________________ Date: _________\n\n[ ] Notarized (if required by state law)\nNotary: _______________________\nDate: _________\nSeal:`,
    disclosure: `DISCLOSURE STATEMENT\nDate: [Date]\n\nTO: [Owner Name]\nFROM: [Company]\nRE: Surplus Funds - [Property Address]\n\nIMPORTANT DISCLOSURES:\n\n1. [Company] is NOT a government agency and is not affiliated with any government entity.\n\n2. You may be entitled to claim surplus funds directly from [County] County, [State] at no cost.\n\n3. Our fee for recovery assistance services is [Fee %] of any successfully recovered amount.\n\n4. There is no guarantee that surplus funds will be recovered.\n\n5. This is not legal advice. We recommend consulting an attorney.\n\n6. You have the right to cancel this agreement per your state's cancellation provisions.\n\nAcknowledgment:\nI have read and understand the above disclosures.\n\nSignature: _______________________ Date: _________\nPrinted Name: [Owner Name]`,
    authorization: `AUTHORIZATION FORM\nDate: [Date]\n\nI, [Owner Name], hereby authorize [Company] and its representatives to:\n\n1. Make inquiries on my behalf regarding surplus funds related to:\n   Property: [Property Address]\n   County/State: [County], [State]\n   Parcel/APN: [Parcel/APN]\n   Case Number: [Case Number]\n\n2. Submit claim documents to the appropriate county authority.\n\n3. Communicate with county officials regarding the status of the claim.\n\nThis authorization does NOT constitute a power of attorney.\n\nOwner Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]`,
    agent_agreement: `THIRD-PARTY RECOVERY AGENT AGREEMENT\nDate: [Date]\n\nTHIS AGREEMENT is between:\nOwner/Claimant: [Owner Name]\nRecovery Agent: [Company]\nAgent Representative: [User Name]\nAgent Registration/Certificate No.: [Agent Registration]\nAgent License No.: [Agent License]\n\n1. PROPERTY AND CLAIM IDENTIFICATION\nProperty Address: [Property Address]\nCounty/State: [County], [State]\nParcel/APN: [Parcel/APN]\nCase Number: [Case Number]\nEstimated Surplus or Claim Value: [Surplus Amount]\nPublic Office or Holder: [County] County or other applicable public authority\n\n2. SERVICES TO BE PROVIDED\nThe Recovery Agent may assist the Claimant with locating public claim records, preparing a claim packet, communicating with the public office or holder, tracking claim status, and organizing supporting documents. The Recovery Agent is not retained to provide legal advice unless separately engaged through a licensed attorney.\n\n3. FEE\nThe Recovery Agent fee is [Fee %] of funds actually recovered and paid to or for the benefit of the Claimant, subject to the maximum fee allowed by applicable state and local law. No fee is owed unless funds are recovered.\n\n4. REQUIRED DISCLOSURES\nThe Claimant may be able to recover these funds directly from the applicable public office or holder without paying a fee. [Company] is not a government agency, is not affiliated with any court, county, state treasury, comptroller, or public trustee, and cannot guarantee recovery. Claimant should review this agreement with an attorney before signing.\n\n5. PAYMENT HANDLING\nUnless a court order or applicable law provides otherwise, recovered funds should be paid directly to the Claimant. The Recovery Agent may invoice only after recovery and only as allowed by the signed agreement and applicable law.\n\n6. CANCELLATION\nClaimant may cancel this agreement within the period required by applicable law. If no specific period is confirmed, use the stricter of the reviewed state rule or [Cancellation Days] calendar days. Cancellation must be accepted in writing.\n\n7. STATE AND COUNTY REQUIREMENTS\nBefore use, confirm all registration, licensing, notarization, witness, fee cap, waiting-period, assignment, and court-filing requirements for [State] and [County] County.\n\nClaimant Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]\n\nRecovery Agent Signature: _______________________ Date: _________\nPrinted Name/Title: [User Name]\n\nNotary/Witness if required:\n_____________________________________________`,
    fee_disclosure: `FEE AND NO-GOVERNMENT-AFFILIATION DISCLOSURE\nDate: [Date]\n\nClaimant: [Owner Name]\nRecovery Agent: [Company]\nMatter: [Property Address], [County] County, [State]\nEstimated Claim Value: [Surplus Amount]\n\nPLEASE READ BEFORE SIGNING\n\n1. [Company] is a private third-party recovery agent. [Company] is not a government agency and is not affiliated with any court, county, state treasury, comptroller, sheriff, trustee, or public official.\n\n2. You may be able to claim the funds directly from the applicable government office or holder without paying a fee.\n\n3. If you choose to use [Company], the fee is [Fee %] of funds actually recovered, subject to any state or county fee cap. No upfront fee is charged by [Company] for this matter unless separately disclosed in writing and allowed by law.\n\n4. There is no guarantee that any funds will be recovered.\n\n5. You may consult an attorney before signing any agreement or authorization.\n\n6. You should receive a copy of every document you sign.\n\nAcknowledgment:\nI have read this disclosure and received a copy.\n\nClaimant Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]`,
    limited_poa: `LIMITED POWER OF ATTORNEY REVIEW FORM\nDate: [Date]\n\nIMPORTANT: This form should be reviewed by a licensed attorney in the applicable state before use. Some states, counties, courts, or holders prohibit or restrict powers of attorney, assignments, or third-party payment directions for recovery claims.\n\nPrincipal/Claimant: [Owner Name]\nAgent: [Company]\nRepresentative: [User Name]\nMatter: [Property Address], [County] County, [State]\nCase Number: [Case Number]\nParcel/APN: [Parcel/APN]\n\nLIMITED AUTHORITY REQUESTED\nThe Principal authorizes Agent only to communicate with the applicable public office or holder, obtain claim status, deliver documents signed by Principal, and receive copies of claim correspondence for the matter identified above.\n\nLIMITATIONS\nThis limited authority does not authorize Agent to settle, assign, transfer, endorse, deposit, or receive funds unless expressly permitted by applicable law and separately approved in a court order or attorney-reviewed instrument. This form does not authorize legal representation.\n\nEXPIRATION\nThis authority expires upon final claim payment, written revocation by Principal, or ____________, whichever occurs first.\n\nPrincipal Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]\n\nAgent Signature: _______________________ Date: _________\nPrinted Name/Title: [User Name]\n\nNotary if required:\n_____________________________________________`,
    cancellation_notice: `NOTICE OF RIGHT TO CANCEL\nDate: [Date]\n\nClaimant: [Owner Name]\nRecovery Agent: [Company]\nMatter: [Property Address], [County] County, [State]\n\nYou may cancel your recovery-agent agreement as allowed by applicable state and local law. If a specific statutory cancellation period has not been confirmed, [Company] will honor cancellation received within [Cancellation Days] calendar days after you sign the agreement.\n\nTo cancel, send written notice by mail, email, or other confirmed delivery to:\n[Company]\n[Company Email]\n[Company Phone]\n[Website]\n\nCancellation Statement:\nI cancel my agreement with [Company] for the matter listed above.\n\nClaimant Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]\n\nDate notice received by company: _______________\nReceived by: _______________`,
    claimant_affidavit: `CLAIMANT VERIFICATION AFFIDAVIT\nDate: [Date]\n\nClaimant: [Owner Name]\nCurrent Mailing Address: [Contact Address]\nPhone: [Contact Phone]\nEmail: [Contact Email]\n\nMatter: [Property Address]\nCounty/State: [County], [State]\nParcel/APN: [Parcel/APN]\nCase Number: [Case Number]\nEstimated Surplus or Claim Value: [Surplus Amount]\n\nI state under penalty of perjury, to the best of my knowledge, that:\n\n1. I am the claimant, owner, heir, assignee, or authorized representative for the claim identified above.\n2. The identifying information provided to [Company] is true and complete.\n3. I understand that the public office, court, trustee, treasurer, comptroller, or holder may require additional proof of identity, ownership, heirship, probate authority, assignment, or court approval.\n4. I understand [Company] is not a government agency and does not provide legal advice.\n\nClaimant Signature: _______________________ Date: _________\nPrinted Name: [Owner Name]\n\nNotary if required:\n_____________________________________________`,
    agent_compliance_checklist: `THIRD-PARTY RECOVERY AGENT COMPLIANCE CHECKLIST\nDate: [Date]\n\nClaimant: [Owner Name]\nMatter: [Property Address], [County] County, [State]\nEstimated Claim Value: [Surplus Amount]\n\nSTATE AND LOCAL REVIEW\n[ ] Confirm third-party recovery is permitted in [State]\n[ ] Confirm fee cap and waiting period\n[ ] Confirm finder registration, private investigator license, or other credential requirements\n[ ] Confirm whether assignment, POA, or direct payment to agent is restricted\n[ ] Confirm required cancellation notice language\n[ ] Confirm required disclosures and contract font/signature/witness/notary rules\n[ ] Confirm county/court/holder claim packet requirements\n[ ] Confirm whether recovered funds must be paid directly to claimant\n\nDOCUMENT PACKET\n[ ] Third-Party Recovery Agent Agreement\n[ ] Fee and No-Government-Affiliation Disclosure\n[ ] Limited Authorization or attorney-reviewed POA\n[ ] Right to Cancel Notice\n[ ] Claimant Verification Affidavit\n[ ] Government claim form\n[ ] Proof of identity\n[ ] Proof of ownership, heirship, probate authority, or assignment\n[ ] Court order or notarization if required\n\nREVIEWED BY\nName: _______________________\nRole: _______________________\nDate: _______________________`,
    official_source_checklist: `OFFICIAL SOURCE CHECKLIST\nDate: [Date]\n\nClaimant: [Owner Name]\nMatter: [Property Address], [County] County, [State]\nCase Number: [Case Number]\nParcel/APN: [Parcel/APN]\n\nUse official state, county, court, treasurer, comptroller, sheriff, trustee, or clerk sources before contacting the claimant or collecting a fee.\n\nOFFICIAL SOURCES REVIEWED\n[ ] County court docket or clerk record\n[ ] County surplus/excess proceeds page\n[ ] State unclaimed property office\n[ ] State finder/heir-finder registration rules\n[ ] State fee cap and disclosure rules\n[ ] State private investigator or recovery-agent licensing guidance\n[ ] County claim form instructions\n[ ] Court order, sale report, trustee report, or disbursement record\n[ ] Claimant identity and ownership/heirship documents\n\nSOURCE LINKS OR REFERENCES\n1. _____________________________________________\n2. _____________________________________________\n3. _____________________________________________\n\nRESULT\n[ ] Claim appears eligible for recovery-agent review\n[ ] Attorney review required before outreach\n[ ] Do not contact / restricted / insufficient support\n\nReviewed by: _______________________ Date: _________`,
    checklist: `CLAIM PACKET CHECKLIST\nDate: [Date]\n\nCase: [Owner Name] - [County], [State]\nProperty: [Property Address]\nSurplus: [Surplus Amount]\n\n[ ] Owner Information Form - completed\n[ ] Recovery Services Agreement - signed\n[ ] Disclosure Statement - signed\n[ ] Authorization Form - signed\n[ ] Proof of Identity (copy of ID)\n[ ] Proof of Ownership / Interest\n[ ] County Claim Form (if required)\n[ ] County Cover Letter\n[ ] Notarization (if required)\n[ ] Return envelope / submission method confirmed\n\nSubmission Method: _______________\nSubmission Date: _______________\nTracking Number: _______________`,
    cover_letter: `[Date]\n\n[County] County\nSurplus Funds Department\n\nRe: Surplus Fund Claim\nProperty: [Property Address]\nParcel/APN: [Parcel/APN]\nSale Date: [Sale Date]\nCase Number: [Case Number]\n\nDear Sir/Madam,\n\nPlease find enclosed a claim for surplus funds on behalf of [Owner Name] related to the above-referenced property.\n\nEnclosed documents include the required claim forms and supporting documentation.\n\nPlease do not hesitate to contact us with any questions.\n\nSincerely,\n\n[User Name]\n[Company]\n[Company Phone]\n[Company Email]`,
    case_summary: `INTERNAL CASE SUMMARY\nDate: [Date]\n\n--- CASE OVERVIEW ---\nOwner: [Owner Name]\nProperty: [Property Address]\nCounty/State: [County], [State]\nParcel/APN: [Parcel/APN]\nSale Date: [Sale Date]\nSurplus Amount: [Surplus Amount]\nCase Number: [Case Number]\n\n--- CONTACT INFO ---\nPhone: [Contact Phone]\nEmail: [Contact Email]\nAddress: [Contact Address]\n\n--- SERVICE DETAILS ---\nCompany: [Company]\nAgent: [User Name]\nFee: [Fee %]\n\n--- STATUS ---\nCurrent Status: ${(record.status || "").replace(/_/g, " ")}\nDeal Score: ${record.deal_score || "N/A"}\n\n--- NOTES ---\n${record.notes || "None"}`,
  };

  let text = templates[type] || "";
  Object.entries(fields).forEach(([key, value]) => {
    text = text.replace(new RegExp(key.replace(/[[\]]/g, "\\$&"), "g"), value);
  });
  return text;
}

export default function Documents() {
  const [selectedRecord, setSelectedRecord] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [preview, setPreview] = useState("");
  const [companySettings, setCompanySettings] = useState({
    company_name: "",
    user_name: "",
    phone: "",
    email: "",
    website: "",
    fee_percent: "",
    agent_registration_number: "",
    agent_license_number: "",
    cancellation_period_days: "",
  });

  const { data: records = [] } = useQuery({
    queryKey: ["surplus-records"],
    queryFn: listSurplusRecords,
  });

  React.useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.settings) setCompanySettings(prev => ({ ...prev, ...user.settings }));
    }).catch(() => {});
  }, []);

  const record = records.find(r => r.id === selectedRecord);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", selectedRecord],
    queryFn: () => base44.entities.Contact.filter({ record_id: selectedRecord }),
    enabled: !!selectedRecord,
  });

  const handleGenerate = () => {
    if (!record || !selectedType) return;
    const text = generateDocument(selectedType, record, contacts, companySettings);
    setPreview(text);
  };

  const handleDownload = () => {
    const blob = new Blob([preview], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType}_${record?.owner_name?.replace(/\s/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Document Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Auto-generate compliance-ready documents</p>
      </div>
      <DisclaimerBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Company Name</Label><Input value={companySettings.company_name} onChange={e => setCompanySettings(p => ({...p, company_name: e.target.value}))} placeholder="Your Company" /></div>
              <div><Label className="text-xs">Your Name</Label><Input value={companySettings.user_name} onChange={e => setCompanySettings(p => ({...p, user_name: e.target.value}))} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={companySettings.phone} onChange={e => setCompanySettings(p => ({...p, phone: e.target.value}))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={companySettings.email} onChange={e => setCompanySettings(p => ({...p, email: e.target.value}))} /></div>
              <div><Label className="text-xs">Website</Label><Input value={companySettings.website} onChange={e => setCompanySettings(p => ({...p, website: e.target.value}))} /></div>
              <div><Label className="text-xs">Fee %</Label><Input type="number" value={companySettings.fee_percent} onChange={e => setCompanySettings(p => ({...p, fee_percent: e.target.value}))} /></div>
              <div><Label className="text-xs">Registration/Certificate No.</Label><Input value={companySettings.agent_registration_number} onChange={e => setCompanySettings(p => ({...p, agent_registration_number: e.target.value}))} /></div>
              <div><Label className="text-xs">License No.</Label><Input value={companySettings.agent_license_number} onChange={e => setCompanySettings(p => ({...p, agent_license_number: e.target.value}))} /></div>
              <div><Label className="text-xs">Cancellation Days</Label><Input type="number" value={companySettings.cancellation_period_days} onChange={e => setCompanySettings(p => ({...p, cancellation_period_days: e.target.value}))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Select Record</Label>
                <Select value={selectedRecord} onValueChange={setSelectedRecord}>
                  <SelectTrigger><SelectValue placeholder="Choose record" /></SelectTrigger>
                  <SelectContent>
                    {records.map(r => <SelectItem key={r.id} value={r.id}>{r.owner_name} - {r.county}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Choose type" /></SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gap-2" onClick={handleGenerate} disabled={!selectedRecord || !selectedType}>
                <FileText className="w-4 h-4" /> Generate Document
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Preview</CardTitle>
                {preview && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1">
                      <Download className="w-3 h-3" /> Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
                      <Printer className="w-3 h-3" /> Print
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {preview ? (
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 p-6 rounded-lg border min-h-[500px] leading-relaxed">{preview}</pre>
              ) : (
                <div className="flex items-center justify-center min-h-[500px] text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a record and document type, then click Generate</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
