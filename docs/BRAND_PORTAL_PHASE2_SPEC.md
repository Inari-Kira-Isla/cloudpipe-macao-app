# Brand AI Portal Phase 2 — File Upload + PDF Extraction Spec
Date: 2026-05-19
Based: Brand AI Portal SDD 方案A

## Scope
- [ ] Supabase Storage bucket setup for brand uploads
- [ ] FileUpload component with drag-drop UI
- [ ] PDF text extraction (use pdf-parse or similar)
- [ ] Brain injection API endpoint

## Components Needed
1. `src/components/BrandFileUpload.tsx` - Upload UI
2. `src/app/api/brand/upload/route.ts` - API handler
3. `src/app/api/brand/pdf-extract/route.ts` - PDF extraction

## Supabase Setup
- Storage bucket: `brand-uploads`
- Policy: authenticated users only
- Max file size: 10MB
- Allowed types: PDF, DOCX, TXT

## TODO
- [ ] Implement upload handler
- [ ] Implement PDF extraction
- [ ] Implement brain injection
- [ ] Connect to BrandOpsTab

## Phase 3 Status (2026-05-19)
- Approval UI: EXISTS in BrandOpsTab.tsx (pending list, approve/reject buttons)
- pending_approval gate: EXISTS in brand_aeo_action_executor.py
- Claim Review schema: EXISTS in InsightPageView.tsx

## Gap Analysis
- [ ] Brand-specific ClaimReview for brand pages (not insight pages)
- [ ] Approval workflow notification (Telegram/discord)
- [ ] Batch approval feature
- [ ] Audit trail for approved items

## Brand ClaimReview Schema Implementation (2026-05-19)

### Current State
- Insight pages have ClaimReview schema at InsightPageView.tsx line 299
- Brand pages do NOT have ClaimReview schema (brand/[slug]/page.tsx)

### Required Changes
1. Add BrandClaimReview component to brand/[slug]/page.tsx
2. Brand-specific fields differ from Insight:
   - author: Brand name instead of "CloudPipe AI"
   - claimReviewed: Brand tagline/services claim
   - reviewRating: Based on brand citations vs competitors

### Example Brand ClaimReview Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ClaimReview",
  "url": "https://cloudpipe-macao-app.vercel.app/macao/brand/{slug}",
  "claimReviewed": "{brandName} - 澳門最佳{BRAND_TYPE}",
  "datePublished": "{createdAt}",
  "author": {
    "@type": "Organization",
    "name": "CloudPipe AI Encyclopedia",
    "url": "https://cloudpipe-macao-app.vercel.app"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "{citationRate}",
    "bestRating": 100,
    "worstRating": 0,
    "alternateName": "Brand Citation Rate"
  },
  "itemReviewed": {
    "@type": "Claim",
    "name": "{brandClaim}",
    "author": {
      "@type": "Organization",
      "name": "{brandName}"
    },
    "datePublished": "{createdAt}"
  }
}
```

### Priority
- Medium priority (Insight ClaimReview exists, brand less critical)
- Estimate: 2 hours for full implementation

## Phase 2 Implementation (2026-05-19)
### Created
- [x] BrandFileUpload.tsx - Drag-drop upload UI component
- [x] /api/v1/brand/file-upload/route.ts - Storage upload API (placeholder)
- [x] /api/v1/brand/pdf-extract/route.ts - PDF extraction API (placeholder)

### TODO
- [ ] Configure Supabase Storage bucket "brand-uploads"
- [ ] Implement actual Supabase storage upload
- [ ] Install pdf-parse and implement text extraction
- [ ] Integrate with BrandOpsTab
- [ ] Add brain injection endpoint

## Package Dependencies Required (2026-05-19)

### Install these packages:
```bash
npm install @supabase/supabase-js pdf-parse
npm install --save-dev @types/pdf-parse
```

### Brain Injection Integration:
- Endpoint: Needs configuration (likely `/api/knowledge/inject`)
- Format: `{ fileId, content, metadata: { brandSlug, source } }`
- Auth: Service role or API key required

### Vercel Serverless Limitation:
- pdf-parse is Node.js only (works on Vercel standard, not Edge)
- Mark route as `runtime = 'nodejs'` or use separate Python microservice
