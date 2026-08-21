# AEO Schema Contract Wiring Status

**Last Updated:** 2026-08-19

## Contract File
- Location: `src/data/aeo_schema_contract.json`
- Version: 1.0.0
- Status: ✅ Present and valid

## TSX Wiring State

### InsightPageView.tsx
- **Status:** ✅ Anthropic preference optimization implemented (2026-08-19)
- **Current:** Uses hardcoded `articleSchema` and `faqSchema` objects + Anthropic-specific enhancements
- **Anthropic Optimization:** Added sdDatePublished, about (semantic type), genre, provenance trail, version, keywords, citation, and isBasedOn fields for improved AI crawler (Claude) citation rates
- **TODO:** Line ~485 in component notes this needs Step5 Gate1 decision for contract wiring

### Other TSX Routes
- macao insights route: Not wired
- Other region routes: Not wired

## Pending Decision (Step5 Gate1)

The actual wiring method requires Step5 to go through /hound four-gates. Three options documented in:

**Reference:** `~/.openclaw/workspace/scripts/aeo_schema_contract_wiring.md`

### Options:
1. **Build-time copy** - Deploy script copies contract to src/data/
2. **npm package / git submodule** - Extract as versionable package
3. **API reading** - Internal API route to read contract

## Action Required

Step5 Gate1 must:
1. Evaluate the 3 wiring options
2. Run /hound four-gates validation
3. Choose and implement the wiring approach
4. Refactor InsightPageView.tsx to read from contract

## Verification Command
```bash
node -e "const c = require('./src/data/aeo_schema_contract.json'); console.log(c.contract_version)"
# Expected: 1.0.0
```
