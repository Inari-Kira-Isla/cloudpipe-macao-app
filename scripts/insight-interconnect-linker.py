#!/usr/bin/env python3
"""
Insight 互連自動化
為相似的 insights 建立相互連結
"""

import os
import sys
from pathlib import Path
from collections import defaultdict
import json

def get_insights():
    """從 Supabase 讀取所有 insights"""
    env_path = Path.home() / "Documents/cloudpipe-macao-app/.env.local"
    env_vars = {}

    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key] = val

    from supabase import create_client

    url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("❌ 缺少 Supabase 配置")
        sys.exit(1)

    supabase = create_client(url, key)

    print("📊 從 Supabase 讀取 insights...")

    # 只讀取已發布的 insights
    columns = "slug,title,tags,status,lang,related_merchant_slugs"

    all_insights = []
    page = 0
    page_size = 500

    while True:
        result = supabase.table("insights").select(columns).eq("status", "published").range(page * page_size, (page + 1) * page_size - 1).execute()
        if not result.data:
            break
        all_insights.extend(result.data)
        page += 1
        print(f"   已獲得 {len(all_insights)} 篇...")

    print(f"   共 {len(all_insights)} 篇已發布 insights")
    return all_insights, supabase

def find_related_insights(insights):
    """為每個 insight 找到相關的其他 insights"""
    print("\n🔗 分析 insight 相似性...")

    # 按 tag 分組
    tag_to_slugs = defaultdict(list)
    slug_to_tags = {}

    for insight in insights:
        slug = insight.get('slug', '')
        tags = insight.get('tags', []) or []
        slug_to_tags[slug] = tags

        for tag in tags:
            tag_to_slugs[tag].append(slug)

    # 為每個 insight 找相關的
    relationships = {}

    for insight in insights:
        slug = insight.get('slug', '')
        tags = insight.get('tags', []) or []

        related = set()

        # 1. 同 tag 的 insights
        for tag in tags:
            related.update(tag_to_slugs[tag])

        # 2. 同地區的 insights（從 slug 提取）
        region = slug.split('-')[0] if slug else ''
        if region:
            for other_slug in slug_to_tags.keys():
                if other_slug.startswith(region + '-') and other_slug != slug:
                    related.add(other_slug)

        # 3. 同類別的 insights（從 slug 提取）
        parts = slug.split('-')
        if len(parts) > 1:
            category = parts[1]
            for other_slug in slug_to_tags.keys():
                other_parts = other_slug.split('-')
                if len(other_parts) > 1 and other_parts[1] == category and other_slug != slug:
                    related.add(other_slug)

        # 移除自己
        related.discard(slug)

        # 限制最多 10 個相關 insights
        relationships[slug] = list(related)[:10]

    print(f"   ✅ 分析完成，平均每篇有 {sum(len(r) for r in relationships.values()) / len(relationships):.1f} 個相關 insights")

    return relationships

def update_related_insights(relationships, supabase):
    """批量更新 related_insights"""
    print("\n📝 批量更新 related_insights...")

    updates = 0
    errors = 0

    for slug, related_list in relationships.items():
        try:
            supabase.table("insights").update(
                {"related_insights": related_list}
            ).eq("slug", slug).execute()
            updates += 1

            if updates % 50 == 0:
                print(f"   ✅ 已更新 {updates} 篇...")

        except Exception as e:
            errors += 1
            if errors <= 5:  # 只顯示前 5 個錯誤
                print(f"   ❌ {slug}: {str(e)[:60]}")

    print(f"\n✅ 更新完成!")
    print(f"   ✅ 成功: {updates}")
    print(f"   ❌ 失敗: {errors}")

def main():
    print("╔═══════════════════════════════════════════════╗")
    print("║  🔗 Insight 互連自動化                      ║")
    print("╚═══════════════════════════════════════════════╝\n")

    try:
        insights, supabase = get_insights()
        relationships = find_related_insights(insights)
        update_related_insights(relationships, supabase)

    except Exception as e:
        print(f"\n❌ 失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
