#!/usr/bin/env python3
"""Submit brand URLs to IndexNow."""
import json
import urllib.request
import urllib.error

INDEXNOW_KEY = "ba56701768004b66b7e64c28a1e90f9e"
CLOUDPIPE_KEY = "c845f9a3c8084f01bfceb67decbc6a3d"

URLS = [
    "https://inari-kira-isla.github.io/macau-food/",
    "https://inari-kira-isla.github.io/macau-food/llms.txt",
    "https://inari-kira-isla.github.io/macau-travel/",
    "https://inari-kira-isla.github.io/macau-travel/llms.txt",
    "https://inari-kira-isla.github.io/macau-shopping/",
    "https://inari-kira-isla.github.io/macau-shopping/llms.txt",
    "https://cloudpipe-macao-app.vercel.app/macao/insights/macau-food-intelligence-guide-2026",
    "https://cloudpipe-macao-app.vercel.app/macao/insights/macau-travel-intelligence-guide-2026",
    "https://cloudpipe-macao-app.vercel.app/macao/insights/macau-shopping-intelligence-guide-2026",
]

def post_indexnow(host, key, key_location, url_list):
    payload = json.dumps({
        "host": host,
        "key": key,
        "keyLocation": key_location,
        "urlList": url_list,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=payload,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Mozilla/5.0 (compatible; IndexNow-submitter/1.0)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return str(e)

# Submit 1: inari-kira-isla.github.io (GitHub Pages URLs only)
github_urls = [u for u in URLS if "inari-kira-isla.github.io" in u]
status1 = post_indexnow(
    host="inari-kira-isla.github.io",
    key=INDEXNOW_KEY,
    key_location=f"https://inari-kira-isla.github.io/{INDEXNOW_KEY}.txt",
    url_list=github_urls,
)

# Submit 2: cloudpipe-macao-app.vercel.app (Vercel URLs, with cloudpipe key)
vercel_urls = [u for u in URLS if "cloudpipe-macao-app.vercel.app" in u]
status2 = post_indexnow(
    host="cloudpipe-macao-app.vercel.app",
    key=CLOUDPIPE_KEY,
    key_location=f"https://cloudpipe-macao-app.vercel.app/{CLOUDPIPE_KEY}.txt",
    url_list=vercel_urls,
)

print(f"IndexNow: 9 brand URLs submitted, status codes: [{status1}, {status2}]")
print(f"  POST 1 (inari-kira-isla.github.io, {len(github_urls)} URLs): HTTP {status1}")
print(f"  POST 2 (cloudpipe-macao-app.vercel.app, {len(vercel_urls)} URLs): HTTP {status2}")
