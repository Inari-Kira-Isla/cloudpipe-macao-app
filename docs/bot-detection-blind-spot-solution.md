# Technical Solution: crawler_visits Bot-Tracking Blind Spot

**Date:** 2026-07-25  
**Status:** Draft for /hound threshold review  
**Priority:** P2

---

## Problem Statement

The current bot detection logic in `track-bot.ts` and `middleware.ts` relies solely on User-Agent (UA) string matching. This approach fails to detect AI bots that:

1. Operate from data centers (US, Japan, Singapore IP ranges)
2. Use generic or randomized User-Agent strings
3. Masquerade as regular browsers

**Impact:**
- **Egress burning**: 1,118,584 insights full-text fetches in 7 days from undetected AI bots
- **Sampling bias**: `generateStaticParams` for insights top-100 uses `crawler_visits` data, missing truly popular slugs that bots are hitting
- **Monitoring gap**: `crawler_monitor` and downstream analytics cannot see real bot traffic

---

## Current State

### Bot Detection Implementation

| File | Detection Method | Coverage |
|------|-----------------|----------|
| `src/lib/track-bot.ts` | UA pattern matching (22 patterns) | OpenAI, Anthropic, Perplexity, Google, etc. |
| `src/middleware.ts` | UA pattern matching + headless Chrome detection | Same + Cloudflare, DataForSeo, script UAs |

### Data Source Limitation

- `crawler_visits` table only captures bot traffic that passes UA detection
- Alternative data sources evaluated:
  - **pg_stat_statements**: Not exposed via PostgREST in this project
  - **Supabase query logs**: Requires enterprise tier
  - **Vercel function logs**: High volume, requires parsing

---

## Proposed Solutions

### Option A: Expand IP-based Bot Detection

**Approach:** Add data center IP range detection to identify bot traffic by source network.

**Implementation:**
1. Maintain a list of known data center IP ranges (CIDR blocks)
2. Check incoming request IP against this list
3. Flag as bot if IP matches data center ranges

**Pros:**
- Catches bots that don't set recognizable UAs
- Works retroactively (no UA changes needed)

**Cons:**
- Requires maintaining IP range database
- May have false positives (VPN users, corporate IPs)
- IP ranges change frequently

**Effort:** Medium (2-3 days)

### Option B: Enhanced User-Agent Detection

**Approach:** Expand UA pattern list and add heuristic detection.

**Implementation:**
1. Add more data center / AI service UA patterns
2. Add heuristics (e.g., high-frequency requests from single IP)
3. Add Headless Chrome detection (already partially implemented)

**Pros:**
- Simple to implement
- Low false positive rate

**Cons:**
- Bot UAs can be spoofed
- Doesn't catch all data center bots

**Effort:** Low (1 day)

### Option C: Alternative Data Source

**Approach:** Use a different data source that captures all API queries.

**Options:**
1. **Supabase REST API logs**: Enable via dashboard (if available)
2. **pg_audit extension**: Enable for query logging
3. **Custom instrumentation**: Add request logging at Vercel edge

**Pros:**
- Captures all traffic regardless of UA

**Cons:**
- May require Supabase plan upgrade
- High storage overhead
- Complex implementation

**Effort:** High (5+ days)

### Recommended: Hybrid Approach (Option A + B)

**Rationale:**
- Option A provides immediate coverage for data center bots
- Option B adds defense-in-depth for known patterns
- Lowest effort-to-impact ratio
- Can be deployed incrementally

---

## Implementation Plan

### Phase 1: Quick Wins (Day 1)

1. Add common data center / cloud provider UA patterns to `track-bot.ts`:
   ```
   # Known AI service patterns that may not be caught
   - DataForSeoBot
   - SerpApi
   - CrawlerAgent
   - AIBot
   - MJ12bot (Majestic)
   - AhrefsBot
   - SemrushBot
   ```

2. Add IP range checks for major cloud providers:
   - AWS (US, JP, SG regions)
   - Google Cloud
   - Azure
   - Cloudflare (already partially done)

### Phase 2: Data Center Detection (Days 2-3)

1. Create `src/lib/bot-ip-ranges.ts`:
   - Define CIDR blocks for major data centers
   - Function to check IP against ranges
   - Periodic update mechanism

2. Integrate into `middleware.ts`:
   - Add IP check after UA check
   - Flag matched IPs as bots

### Phase 3: Monitoring Enhancement (Days 4-5)

1. Add "DataCenterBot" category in `BOT_NAME_MAP`
2. Track detected data center IPs separately for analysis
3. Add dashboard view for data center bot traffic

---

## Impact Assessment

### Scope

| Component | Impact | Notes |
|-----------|--------|-------|
| `track-bot.ts` | Modify | Add UA patterns + IP detection |
| `middleware.ts` | Modify | Add IP-based bot detection |
| `crawler_visits` table | Schema change optional | New `is_data_center` flag |
| `generateStaticParams` | Indirect | Better sampling via improved data |
| `crawler_monitor` | Indirect | Will see more accurate traffic |

### Risk

- **False positives**: VPN users flagged as bots → Low risk, can add user-facing opt-out
- **Performance**: IP range check adds ~1ms per request → Acceptable
- **Maintenance**: IP ranges need periodic updates → Quarterly review

### Backward Compatibility

- Existing UA detection continues to work
- No breaking changes to crawler_visits schema
- Gradual rollout possible (IP detection can be additive)

---

## Acceptance Criteria

1. [ ] Data center bot traffic visible in crawler_visits
2. [ ] generateStaticParams reflects actual high-traffic slugs
3. [ ] No regression in existing bot detection
4. [ ] Performance impact < 5ms per request

---

## Next Steps

1. **/hound threshold review**: Formal assessment of this proposal
2. **Phase 1 implementation**: Add missing UA patterns
3. **IP range compilation**: Gather CIDR blocks for major providers
4. **Testing**: Verify detection in staging before production
