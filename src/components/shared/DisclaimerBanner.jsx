import React from "react";
import { AlertTriangle } from "lucide-react";

export default function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
        <span className="font-semibold">Legal Disclaimer:</span> This app does not provide legal advice. 
        Users must verify all laws with an attorney or official state/county authority before contacting 
        claimants or collecting fees.
      </p>
    </div>
  );
}