import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leads_api_url } = await req.json();

  if (!leads_api_url) {
    return Response.json({ error: 'leads_api_url is required' }, { status: 400 });
  }

  // Fetch from external API
  let apiRes;
  try {
    apiRes = await fetch(leads_api_url, {
      headers: { 'Accept': 'application/json' },
    });
  } catch (fetchErr) {
    return Response.json({ error: `Could not reach API: ${fetchErr.message}` }, { status: 502 });
  }

  if (!apiRes.ok) {
    return Response.json({ error: `API returned HTTP ${apiRes.status}` }, { status: 502 });
  }

  let apiLeads;
  try {
    apiLeads = await apiRes.json();
  } catch {
    return Response.json({ error: 'API response is not valid JSON' }, { status: 502 });
  }
  const leads = Array.isArray(apiLeads) ? apiLeads : (apiLeads.leads || apiLeads.data || []);

  // Fetch all existing records to check duplicates
  const existing = await base44.asServiceRole.entities.SurplusRecord.list('-created_date', 1000);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lead of leads) {
    const mapped = {
      owner_name: lead.owner_name || lead.ownerName || lead.name || '',
      property_address: lead.property_address || lead.propertyAddress || lead.address || '',
      county: lead.county || '',
      state: lead.state || '',
      parcel_apn: lead.parcel_number || lead.parcelNumber || lead.parcel_apn || '',
      surplus_amount: parseFloat(lead.surplus_amount || lead.surplusAmount || 0) || 0,
      case_number: lead.case_number || lead.caseNumber || lead.case_no || lead.caseNo || '',
      source_url: lead.source_url || lead.sourceUrl || lead.url || '',
      status: lead.status || 'new_lead',
      deal_score: parseFloat(lead.lead_score || lead.leadScore || lead.deal_score || 0) || 0,
      notes: lead.discovered_at ? `Discovered: ${lead.discovered_at}` : undefined,
    };

    if (!mapped.owner_name || !mapped.state || !mapped.county) {
      skipped++;
      continue;
    }

    // Find duplicate by source_url, case_number, or parcel_apn
    const duplicate = existing.find(r =>
      (mapped.source_url && r.source_url === mapped.source_url) ||
      (mapped.case_number && r.case_number === mapped.case_number) ||
      (mapped.parcel_apn && r.parcel_apn === mapped.parcel_apn && r.state === mapped.state)
    );

    if (duplicate) {
      // Update if incoming lead_score is higher or surplus_amount differs
      const needsUpdate =
        (mapped.deal_score > (duplicate.deal_score || 0)) ||
        (mapped.surplus_amount && mapped.surplus_amount !== duplicate.surplus_amount);

      if (needsUpdate) {
        await base44.asServiceRole.entities.SurplusRecord.update(duplicate.id, {
          surplus_amount: mapped.surplus_amount || duplicate.surplus_amount,
          deal_score: mapped.deal_score || duplicate.deal_score,
          case_number: mapped.case_number || duplicate.case_number,
          property_address: mapped.property_address || duplicate.property_address,
          source_url: mapped.source_url || duplicate.source_url,
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Create new record
      if (!mapped.deal_label) {
        if (mapped.deal_score >= 80) mapped.deal_label = 'hot_lead';
        else if (mapped.deal_score >= 60) mapped.deal_label = 'strong_lead';
        else if (mapped.deal_score >= 40) mapped.deal_label = 'needs_research';
        else mapped.deal_label = 'low_priority';
      }
      const createdRecord = await base44.asServiceRole.entities.SurplusRecord.create(mapped);
      existing.push(createdRecord);
      created++;
    }
  }

  return Response.json({ success: true, created, updated, skipped, total: leads.length });
});
