import requests
import pandas as pd

sources = [
    "https://example-county.gov/surplus-list.csv"
]

leads = []

for url in sources:
    try:
        df = pd.read_csv(url)

        for _, row in df.iterrows():
            leads.append({
                "owner": row.get("Owner"),
                "address": row.get("Address"),
                "amount": row.get("Amount"),
                "source": url,
                "status": "New Lead"
            })
    except Exception as e:
        print(f"Error with {url}: {e}")

output = pd.DataFrame(leads)
output.to_csv("surplus_master.csv", index=False)

print("Done.")