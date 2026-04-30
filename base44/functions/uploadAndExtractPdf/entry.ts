import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Request must be multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Upload the file using the integration (accepts a File/Blob)
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

  // Extract structured lead data from the uploaded PDF
  const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: "object",
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              owner_name: { type: "string", description: "Full name of the property owner or claimant" },
              property_address: { type: "string", description: "Full property address" },
              county: { type: "string", description: "County name" },
              state: { type: "string", description: "Two-letter state abbreviation" },
              parcel_apn: { type: "string", description: "Parcel number or APN identifier" },
              surplus_amount: { type: "number", description: "Dollar amount of the surplus funds" },
              sale_date: { type: "string", description: "Date of the tax sale or auction in YYYY-MM-DD format" },
              case_number: { type: "string", description: "Case or reference number" },
              record_type: { type: "string", description: "Type: tax_sale, foreclosure, auction, or other" },
              notes: { type: "string", description: "Any additional relevant notes from the document" }
            }
          }
        },
        summary: { type: "string", description: "Brief summary of what was found in the document" }
      }
    }
  });

  if (result.status !== 'success') {
    return Response.json({ error: result.details || 'Extraction failed' }, { status: 500 });
  }

  return Response.json({
    records: result.output?.records || [],
    summary: result.output?.summary || ''
  });
});