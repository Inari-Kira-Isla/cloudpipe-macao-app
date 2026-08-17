#!/usr/bin/env python3
"""
批量評分現有內容 - 對資料庫中現有 insights 進行批量原創性評分
"""

import os
import sys
from pathlib import Path

# 載入環境變數
env_path = Path(__file__).parent.parent / ".env.local"
env_vars = {}

with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            key, val = line.split("=", 1)
            env_vars[key] = val

from supabase import create_client

url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL").strip('"').strip("'")
key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY").strip('"').strip("'")

if not all([url, key]):
    print("❌ 缺少 Supabase 配置")
    sys.exit(1)

supabase = create_client(url, key)

print("=== 正在獲取所有 insights ===\n")

# 獲取所有 insights
response = supabase.table("insights").select(
    "slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, body_html, faqs"
).execute()

insights = response.data
print(f"找到 {len(insights)} 個 insights\n")

if not insights:
    print("沒有可評分的內容")
    sys.exit(0)

# 評分邏輯
def calculate_originality_score(insight):
    """計算原創性分數"""
    score = 0
    
    # 1. Trust Score (0-35 points)
    trust_score = insight.get("trust_score") or 0
    trust_points = (trust_score / 100) * 0.35 * 100
    
    # 2. Verification Sources (0-25 points)
    sources = insight.get("verification_sources") or []
    if sources:
        verification_points = min(len(sources) * 8, 25)
    else:
        verification_points = 0
    
    # 3. Fact Check (0-20 points)
    fact_check = insight.get("fact_check")
    fact_check_points = 0
    if fact_check and isinstance(fact_check, dict):
        fact_score = fact_check.get("score") or 0
        fact_check_points = (fact_score / 100) * 0.20 * 100
    
    # 4. Freshness (0-10 points)
    import datetime
    updated_at = insight.get("updated_at")
    if updated_at:
        try:
            updated = datetime.datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            days_since = (datetime.datetime.now(datetime.timezone.utc) - updated.replace(tzinfo=datetime.timezone.utc)).days
            if days_since <= 7:
                freshness_points = 10
            elif days_since <= 30:
                freshness_points = 8
            elif days_since <= 90:
                freshness_points = 5
            elif days_since <= 180:
                freshness_points = 3
            else:
                freshness_points = 1
        except:
            freshness_points = 5
    else:
        freshness_points = 5
    
    # 5. Uniqueness (0-10 points)
    uniqueness_points = 5  # 基礎分
    content = insight.get("body_html") or ""
    if "application/ld+json" in content or '"@context"' in content:
        uniqueness_points += 2
    if "faq" in content.lower() or (insight.get("faqs") and len(insight.get("faqs", [])) > 0):
        uniqueness_points += 2
    if len(content) > 2000:
        uniqueness_points += 1
    
    # 總分
    total = round(trust_points + verification_points + fact_check_points + freshness_points + uniqueness_points)
    total = min(total, 100)
    
    # 等級
    if total >= 90:
        grade = "A"
    elif total >= 75:
        grade = "B"
    elif total >= 60:
        grade = "C"
    elif total >= 40:
        grade = "D"
    else:
        grade = "F"
    
    # 是否值得引用
    citation_worthy = total >= 60
    
    return {
        "score": total,
        "grade": grade,
        "citation_worthy": citation_worthy
    }

# 評分每個 insight
results = []
for insight in insights:
    result = calculate_originality_score(insight)
    results.append({
        "slug": insight["slug"],
        "title": insight.get("title") or insight["slug"],
        "score": result["score"],
        "grade": result["grade"],
        "citation_worthy": result["citation_worthy"]
    })
    
    # Skip DB update since columns don't exist yet
    # supabase.table("insights").update({
    #     "originality_score": result["score"],
    #     "originality_grade": result["grade"],
    #     "citation_worthy": result["citation_worthy"]
    # }).eq("slug", insight["slug"]).execute()
    
    sys.stdout.write(".")
    sys.stdout.flush()

print("\n")

# 統計
citation_worthy = [r for r in results if r["citation_worthy"]]
by_grade = {
    "A": len([r for r in results if r["grade"] == "A"]),
    "B": len([r for r in results if r["grade"] == "B"]),
    "C": len([r for r in results if r["grade"] == "C"]),
    "D": len([r for r in results if r["grade"] == "D"]),
    "F": len([r for r in results if r["grade"] == "F"]),
}

print("=== 評分完成 ===\n")
print(f"總計: {len(results)}")
print(f"值得引用: {len(citation_worthy)}")
print(f"等級分布: A={by_grade['A']}, B={by_grade['B']}, C={by_grade['C']}, D={by_grade['D']}, F={by_grade['F']}\n")

# Top 10
print("=== Top 10 ===")
sorted_results = sorted(results, key=lambda x: x["score"], reverse=True)[:10]
for i, r in enumerate(sorted_results, 1):
    print(f"{i}. [{r['grade']}] {r['score']}pts - {r['title'][:60]}")

# 值得引用的內容
print("\n=== 值得引用的內容 ===")
for r in citation_worthy:
    print(f"★ [{r['grade']}] {r['score']}pts - {r['title'][:60]}")
