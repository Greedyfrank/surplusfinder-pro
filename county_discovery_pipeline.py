import requests
import pandas as pd
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from datetime import datetime

# -----------------------------
# CONFIG
# -----------------------------

TARGET_STATES = ["Texas"]

SEARCH_TERMS = [
    "tax sale surplus",
    "excess proceeds",
    "overage funds",
    "foreclosure surplus",
    "sheriff sale surplus",
    "tax auction surplus",
    "unclaimed excess proceeds"
]

COUNTIES = {
    "Texas": [
        "Collin County",
        "Dallas County",
        "Tarrant County",
        "Denton County",
        "Grayson County",
        "Rockwall County",
        "Hunt County",
        "Kaufman County",
        "Ellis County",
        "Parker County"
    ]
}

OFFICIAL_DOMAIN_HINTS = [
    ".gov",
    ".us",
    "county",
    "clerk",
    "tax",
    "sheriff",
    "treasurer",
    "trustee"
]

DOCUMENT_HINTS = [
    ".pdf",
    ".csv",
    ".xlsx",
    ".xls"
]

HEADERS = {
    "User-Agent": "SurplusFinderPro/1.0 public-record-research contact@example.com"
}

OUTPUT_DISCOVERED = "discovered_county_sources.csv"


# -----------------------------
# SOURCE SCORING
# -----------------------------

def score_url(url, title="", snippet=""):
    text = f"{url} {title} {snippet}".lower()
    score = 0

    if ".gov" in text:
        score += 40
    if ".us" in text:
        score += 15

    for hint in OFFICIAL_DOMAIN_HINTS:
        if hint in text:
            score += 8

    for term in SEARCH_TERMS:
        if term in text:
            score += 15

    for doc in DOCUMENT_HINTS:
        if doc in text:
            score += 20

    if "surplus" in text:
        score += 20
    if "excess proceeds" in text:
        score += 25
    if "overage" in text:
        score += 20
    if "unclaimed" in text:
        score += 10

    return min(score, 100)


# -----------------------------
# BASIC WEB SEARCH PLACEHOLDER
# -----------------------------
# Recommended production options:
# - Bing Web Search API
# - Google Programmable Search Engine
# - SerpAPI
# - Brave Search API
#
# Do not scrape Google/Bing result pages directly.

def search_web_api(query):
    """
    Replace this function with your approved search API.
    Return format should be:
    [
        {"title": "...", "url": "...", "snippet": "..."}
    ]
    """

    print(f"[SEARCH PLACEHOLDER] {query}")

    # Mock/example results
    return [
        {
            "title": "Example County Excess Proceeds",
            "url": "https://examplecounty.gov/tax/excess-proceeds.pdf",
            "snippet": "Tax sale excess proceeds list."
        }
    ]


# -----------------------------
# DISCOVER COUNTY SOURCES
# -----------------------------

def discover_sources():
    discovered = []

    for state in TARGET_STATES:
        counties = COUNTIES.get(state, [])

        for county in counties:
            for term in SEARCH_TERMS:
                query = f"{county} {state} {term}"

                results = search_web_api(query)

                for result in results:
                    url = result.get("url", "")
                    title = result.get("title", "")
                    snippet = result.get("snippet", "")

                    if not url:
                        continue

                    score = score_url(url, title, snippet)

                    discovered.append({
                        "state": state,
                        "county": county,
                        "query": query,
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                        "source_score": score,
                        "discovered_at": datetime.now().isoformat()
                    })

    df = pd.DataFrame(discovered)
    df = df.drop_duplicates(subset=["url"])
    df = df.sort_values(by="source_score", ascending=False)
    df.to_csv(OUTPUT_DISCOVERED, index=False)

    print(f"Discovery complete → {OUTPUT_DISCOVERED}")
    return df


# -----------------------------
# VALIDATE DISCOVERED SOURCES
# -----------------------------

def validate_sources(df):
    validated = []

    for _, row in df.iterrows():
        url = row["url"]

        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            content_type = response.headers.get("content-type", "").lower()

            is_reachable = response.status_code == 200

            validated.append({
                **row.to_dict(),
                "status_code": response.status_code,
                "content_type": content_type,
                "reachable": is_reachable
            })

            print(f"{response.status_code} → {url}")

        except Exception as e:
            validated.append({
                **row.to_dict(),
                "status_code": "ERROR",
                "content_type": "",
                "reachable": False,
                "error": str(e)
            })

    out = pd.DataFrame(validated)
    out.to_csv("validated_county_sources.csv", index=False)

    print("Validation complete → validated_county_sources.csv")
    return out


# -----------------------------
# RUN
# -----------------------------

if __name__ == "__main__":
    discovered_df = discover_sources()
    validated_df = validate_sources(discovered_df)

    print("County discovery pipeline complete.")