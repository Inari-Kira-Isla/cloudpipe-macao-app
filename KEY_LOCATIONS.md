# KEY_LOCATIONS.md - Credential & Key Management

> CloudPipe Macao App - Single Source of Truth for API Keys, OAuth Tokens, and Service Accounts

---

## §3 Supabase Credentials

### §3.1 Active Projects

| Project Name | Ref ID | Key Type | Location | Status | Last Verified |
|-------------|--------|----------|----------|--------|---------------|
| Inari-Kira-Isla's Project | yitmabzsxfgbchhhjjef | sb_secret_ | .env.supabase | ✅ Active | 2026-08-09 |
| inari-production | cqartwwsbxnjjatmndtt | (TBD) | - | ✅ Active | 2026-08-09 |
| codex-handoff-ops | gkubrsegqtvvpdqukqyt | legacy JWT ⚠️ | LaunchAgent + .env.codex-handoff | ✅ Working (heartbeat active) | 2026-08-09 |

### §3.2 Legacy JWT Locations (Pending Migration)

**⚠️ CRITICAL: New projects MUST use sb_secret_ format (see §3.3 checklist)**

**codex-handoff-ops (gkubrsegqtvvpdqukqyt)** — CREATED 2026-08-08
- `~/Library/LaunchAgents/ai.cloudpipe.codex-handoff-heartbeat.plist` - CODEX_HANDOFF_SUPABASE_SERVICE_ROLE_KEY
- `~/.openclaw/github/openclaw-workspace/scripts/.env.codex-handoff` - CODEX_HANDOFF_SUPABASE_SERVICE_ROLE_KEY
- **Status**: ✅ Key WORKING (heartbeat writing to codex_handoff_heartbeats table), but uses deprecated legacy JWT format
- **Action Required**: Migrate to sb_secret_ format

**csmhkfovxzadwsnymxfc** — NOT FOUND IN CODEBASE
- Task claimed legacy JWT in `macao_pt_translation_task.py`, but file does not exist
- Project ref not found in any .env, .plist, or script files
- **Status**: ❌ Not used / possibly fictional — no action needed

**Other Legacy JWTs Found**
- `~/.openclaw/workspace/scripts/crawler_cache_to_json.py` - yitmabzsxfgbchhhjjef (service_role) - VALID
- `~/.openclaw/workspace/scripts/keyword_system_builder.py` - yivmabzsxfgbchhhjjef (anon) - INVALID ref, needs cleanup

### §3.3 New Project Checklist — MANDATORY ✅

**RULE: All new Supabase projects MUST use sb_secret_ format. Legacy JWT is forbidden.**

For any new Supabase project, complete this checklist BEFORE deploying:

- [ ] **1. Create project** in Supabase dashboard
- [ ] **2. Set secret** via CLI:
  ```bash
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sb_secret_xxx> --project-ref <ref_id>
  ```
- [ ] **3. Use sb_secret_ format** in ALL environment files and LaunchAgent plists
- [ ] **4. Register** in §3.1 Active Projects table with exact location
- [ ] **5. Test connectivity** before leaving the task
- [ ] **6. Delete any legacy JWT** hardcoded in scripts (lint check: `grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --include="*.py"`)

**Correct format:**
```bash
# ✅ CORRECT
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Legacy (FORBIDDEN):**
```bash
# ❌ WRONG - legacy JWT format
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
```

**Migration path for existing legacy JWT projects:**
1. Get new sb_secret_ key from Supabase Dashboard → Settings → API
2. Update all locations (env files, plists, scripts)
3. Test with `supabase projects API-STATUS`
4. Delete old legacy JWT after verification

### §3.4 Notes

- Legacy JWT = JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- New format = `sb_secret_` prefix (Supabase secrets management)
- All new projects must use sb_secret_ format
- Legacy JWTs are still valid but deprecated and will be phased out

---

## §10.1 GSC Credentials - RETIRED

### Credential Details
- **Service**: Google Search Console (GSC) - Golden Page Enricher
- **Label**: `ai.openclaw.gsc-golden-enricher`
- **Token File**: `~/.credentials/token.json`
- **Scopes**: `https://www.googleapis.com/auth/webmasters.readonly`, `spreadsheets`, `drive`
- **Client ID**: `305278332994-rcovn0h64pqt6vkqckmcn0qu5ludpfjl.apps.googleusercontent.com`

### Failure History
| Date | Error | Occurrences |
|------|-------|-------------|
| 2026-04-13 05:00 | `invalid_grant: Token has been expired or revoked.` | First failure |
| 2026-04-13 to 2026-07-06 | `invalid_grant` | 12 times total |
| 2026-07-06 | Last failure | - |

### Disposition Decision (2026-08-09)
**STATUS: RETIRED** ✅

**Rationale:**
1. Token expired/revoked on 2026-04-13 (~4 months ago)
2. Refresh token invalid - cannot re-authorize without user interaction
3. No evidence of urgent production need in 4 months
4. Script falls back to simulated data (non-blocking)
5. This is credential #7 (edge-triggered-alert-no-persistence, longest潜伏 case)

**Action Taken:**
- Plist disabled: `ai.openclaw.gsc-golden-enricher.plist.disabled`
- No re-authorization attempted (would require OAuth flow)
- Removed from active credential tracking

**Ecosystem Impact:**
- GSC golden page enrichment uses simulated data
- No production alerts for this credential failure
- Related plist: `ai.openclaw.gsc-sitemap-daily.plist` (still active, separate credential)

---

## §8.7 Google Keys (Active)

*(Section reserved for active Google API credentials)*

### Notes
- Re-authorization would require OAuth2 installed app flow
- Token location: `~/.credentials/token.json`
- See `oauth_setup.py` in project root for re-authentication procedure

---

*Last Updated: 2026-08-09*
*Decision: GSC production line retired - no re-authorization attempted*

---

## §10.2 Supabase Legacy JWT Audit (2026-08-09)

### Findings

| Project Ref | Project Name | Legacy JWT Location | Status | Action |
|-------------|--------------|---------------------|--------|--------|
| gkubrsegqtvvpdqukqyt | codex-handoff-ops | LaunchAgent + .env.codex-handoff | ✅ Working | Migrate to sb_secret_ |
| csmhkfovxzadwsnymxfc | (not found) | macao_pt_translation_task.py (file missing) | ❌ Not used | No action |

### Action Items
- [ ] Migrate codex-handoff-ops to sb_secret_ format
- [ ] Verify all new projects follow §3.3 checklist
- [ ] Run periodic audit: `grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --include="*.py" --include="*.plist"`
