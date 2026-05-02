import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const compact = (value: unknown) => String(value || '').trim();

const getStrings = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return compact(obj.address || obj.number || obj.value || obj.phone || obj.email);
      }
      return '';
    })
    .filter(Boolean);
};

const getMailingAddress = (data: Record<string, unknown>) => {
  const streetAddresses = Array.isArray(data.street_addresses) ? data.street_addresses : [];
  const first = streetAddresses[0] as Record<string, unknown> | undefined;
  if (first) {
    return [
      compact(first.street_address || first.name),
      compact(first.locality),
      compact(first.region),
      compact(first.postal_code),
    ].filter(Boolean).join(', ');
  }

  const locationNames = data.location_names;
  if (Array.isArray(locationNames) && locationNames.length > 0) {
    return compact(locationNames[0]);
  }
  return '';
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { record_id } = await req.json();
  if (!record_id) {
    return Response.json({ error: 'record_id is required' }, { status: 400 });
  }

  const apiKey = user.settings?.api_pdl;
  if (!apiKey) {
    return Response.json({ error: 'People Data Labs API key is missing in Settings > Integrations' }, { status: 400 });
  }

  const record = await base44.asServiceRole.entities.SurplusRecord.get(record_id);
  if (!record) {
    return Response.json({ error: 'Record not found' }, { status: 404 });
  }
  if (!record.owner_name) {
    return Response.json({ error: 'Record needs an owner name before enrichment' }, { status: 400 });
  }

  const payload = {
    name: record.owner_name,
    location: [record.property_address, record.county, record.state, 'United States'].filter(Boolean).join(', '),
    region: record.state,
    country: 'United States',
    min_likelihood: 2,
    titlecase: true,
    data_include: 'full_name,emails,phone_numbers,mobile_phone,location_names,street_addresses',
  };

  const response = await fetch('https://api.peopledatalabs.com/v5/person/enrich', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 404) {
    return Response.json({ matched: false, message: 'No PDL match found' });
  }

  const result = await response.json();
  if (!response.ok) {
    return Response.json({ error: result?.error?.message || `PDL returned HTTP ${response.status}` }, { status: 502 });
  }

  const data = result.data || {};
  const phoneNumbers = Array.from(new Set([
    ...getStrings(data.phone_numbers),
    compact(data.mobile_phone),
  ].filter(Boolean)));
  const emails = Array.from(new Set(getStrings(data.emails)));
  const fullName = compact(data.full_name) || record.owner_name;
  const mailingAddress = getMailingAddress(data);

  const contactPayload = {
    record_id,
    full_name: fullName,
    mailing_address: mailingAddress,
    phone_numbers: phoneNumbers,
    emails,
    confidence_score: result.likelihood ? Math.round(Number(result.likelihood) * 10) : undefined,
    source_provider: 'People Data Labs',
    last_verified_date: new Date().toISOString().slice(0, 10),
  };

  const existingContacts = await base44.asServiceRole.entities.Contact.filter({ record_id });
  const existing = (existingContacts || []).find((contact: Record<string, unknown>) =>
    compact(contact.source_provider) === 'People Data Labs' ||
    compact(contact.full_name).toLowerCase() === fullName.toLowerCase()
  );

  const contact = existing
    ? await base44.asServiceRole.entities.Contact.update(compact(existing.id), contactPayload)
    : await base44.asServiceRole.entities.Contact.create(contactPayload);

  return Response.json({
    matched: true,
    contact,
    likelihood: result.likelihood,
  });
});
