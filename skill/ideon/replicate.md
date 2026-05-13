# Replicate Integration: Image Generation

This document covers the image generation workflow using Replicate, including model selection, cost tracking, error handling, and integration patterns for agents.

---

## Overview

The Ideon skill generates high-quality images for content using **Replicate**, a cloud platform for running machine learning models. Agents use Replicate to render text-to-image prompts into WebP files embedded in the final content.

**Key facts:**
- Model: Flux (text-to-image, state-of-the-art, ~30–120 seconds per image)
- Cost: ~$0.10–0.25 USD per image (varies by model & complexity)
- Output: WebP files (1024×1024, lossless quality)
- Integration: Via Replicate API (requires valid API token)

---

## Replicate Setup

### Prerequisites

1. **Replicate Account & API Token**
   - Visit: https://replicate.com/
   - Sign up or log in
   - Navigate to: Account → API Tokens
   - Copy token (format: `r8_...`)
   - Agent should securely store token for authentication

2. **API Token Validation**
   - Before Stage 5 (Image Rendering), agent must validate token:
     - Check token is non-empty ✓
     - Check token format (starts with `r8_` or similar) ✓
     - Optionally: Make a test API call to Replicate to verify token is active
   - If invalid: Ask user to provide valid token and retry

### Rate Limits

Replicate enforces rate limits based on account tier:
- **Free tier:** ~5–10 images/hour
- **Paid tier:** Up to 100+ images/hour (depends on plan)

If agent hits rate limit:
- Agent receives HTTP 429 error
- Ideon automatically retries up to `t2i.maxAttempts` times (default 4), honoring the `retry_after` value from the 429 response body and capping each wait at 60 seconds. No manual sleep needed in the agent loop.
- If retries are exhausted, the error surfaces as `Replicate <kind> image (<id>) failed after N attempts: <original message>` and the run can be resumed via `ideon write resume`.
- Tune via `t2i.maxAttempts` in settings if you want fewer/more retries.

---

## Image Model Catalog

### Supported Models

**Primary (Recommended):**
- **Model:** `black-forest-labs/flux-pro` or `black-forest-labs/flux-1.1-pro`
- **Alias:** `flux` (in Ideon config)
- **Description:** State-of-the-art text-to-image model, highest quality
- **Speed:** 30–120 seconds per image (fast inference)
- **Quality:** Photorealistic, detailed, excellent prompt following
- **Cost:** ~$0.15–0.25 per image (highest quality = highest cost)
- **Recommended for:** Articles, blog posts, professional content

**Alternative Models (if needed):**
- **Model:** `black-forest-labs/flux-schnell`
- **Alias:** `flux-schnell` (in Ideon config)
- **Description:** Faster variant of Flux, slightly lower quality
- **Speed:** 5–15 seconds per image (very fast)
- **Cost:** ~$0.03 per image (budget-friendly)
- **Recommended for:** Quick turnarounds, X/Twitter posts, newsletters

- **Model:** `stability-ai/stable-diffusion-3`
- **Alias:** `sd3` (in Ideon config)
- **Description:** Stable Diffusion 3, reliable fallback
- **Speed:** 15–40 seconds
- **Cost:** ~$0.05 per image
- **Recommended for:** Budget-conscious runs, when Flux is unavailable

**Deprecated (avoid):**
- Stable Diffusion 2.1 (older, lower quality)
- DALL-E 2 via OpenAI (expensive, requires separate API)

### Model Selection by Agent

**Default:** Flux (black-forest-labs/flux-pro)

**User-Driven Selection:**
If agent asks user to select model:
```
Which image model would you like?

1. Flux Pro (default) — Highest quality, ~$0.18/image, 60–120s
   Recommended for articles, professional content

2. Flux Schnell — Fast & budget-friendly, ~$0.03/image, 5–15s
   Recommended for quick turnarounds

3. Stable Diffusion 3 — Reliable fallback, ~$0.05/image, 15–40s
   Recommended for budget-conscious projects

Choice: [1/2/3] (default: 1)
```

---

## Image Generation Workflow

### Step 1: Validate Input

Before calling Replicate, agent verifies:
- Image prompt length: 10–1000 characters ✓
- Image prompt language: English ✓
- Image count requested: 1–10 ✓
- Replicate token: Valid ✓

### Step 2: Prepare Image Slots

For each image slot (cover + inline images):
- Generate unique ID (e.g., `cover`, `inline-1`, `inline-2`)
- Associate with section anchor (after which section should image appear)
- Generate detailed prompt (from Stage 4)

**Example image slot:**
```json
{
  "id": "cover",
  "kind": "cover",
  "section": null,
  "expandedPrompt": "Minimalist, clean technical diagram showing React Suspense data flow with async boundaries, blue and white color palette, 3D rendered, editorial illustration, high quality"
}
```

### Step 3: Submit to Replicate

For each image slot:

1. **Build API request:**
   ```json
   {
     "model": "black-forest-labs/flux-pro",
     "prompt": "[expandedPrompt from Stage 4]",
     "width": 1024,
     "height": 1024,
     "num_outputs": 1,
     "seed": null,
     "guidance_scale": 7.5
   }
   ```

2. **Call Replicate API:**
   ```
   POST https://api.replicate.com/v1/predictions
   Authorization: Token r8_...
   Content-Type: application/json
   ```

3. **Poll for completion:**
   - Replicate returns prediction ID
   - Agent polls status endpoint every 2–5 seconds
   - Status flow: `starting` → `processing` → `succeeded` or `failed`

4. **Retrieve output:**
   - On `succeeded`: Download image URL
   - Save to temporary location
   - Convert to WebP format (if not already)

### Step 4: Handle Timeouts

If single image generation exceeds timeout:

**Timeout thresholds:**
- Per image: 5 minutes (300 seconds)
- Total batch: 15 minutes (900 seconds)

**On timeout:**
- If < 3 retries: Retry with exponential backoff (wait 30s, retry)
- If >= 3 retries: Offer user choice:
  - "Retry again?"
  - "Skip this image?"
  - "Cancel the entire run?"

**Example user prompt:**
```
⏱️ IMAGE GENERATION TIMEOUT
════════════════════════════════════════
Image "inline-2" has been generating for 5+ minutes.

Options:
(1) Retry (wait 30s, try again)
(2) Skip this image
(3) Cancel run

Choice: [1/2/3]
```

### Step 5: Validate Output

After download, agent verifies:
- File is valid image (WebP, PNG, or JPEG) ✓
- File size > 100 KB (meaningful quality) ✓
- Image dimensions: 1024×1024 ✓
- File is readable ✓

If validation fails: Retry image generation (max 2 retries total)

### Step 6: Convert to WebP

If Replicate returns PNG/JPEG:
- Convert to WebP format (lossless)
- Save to `assets/images/<id>.webp`
- Verify file size (WebP should be ~20–40% smaller than PNG)

---

## Cost Tracking

### Per-Image Cost Calculation

Each image generation logs:
- Model used
- Prompt length (tokens)
- Generation duration (seconds)
- Attempt count (retries)
- USD cost estimate

**Replicate pricing (as of May 2026):**

| Model | Cost/Image | Duration | Quality |
|-------|-----------|----------|---------|
| Flux Pro | $0.18 | 60–120s | ⭐⭐⭐⭐⭐ |
| Flux Schnell | $0.03 | 5–15s | ⭐⭐⭐⭐ |
| SD3 | $0.05 | 15–40s | ⭐⭐⭐ |

### Batch Cost Summary

Agent calculates total cost before Checkpoint 2:

```
📊 IMAGE GENERATION COSTS
════════════════════════════════════════
Model: Flux Pro

Image 1 (cover):           $0.18 (87 seconds)
Image 2 (inline-1):        $0.18 (92 seconds)
Image 3 (inline-2):        $0.18 (85 seconds)
Subtotal (3 images):       $0.54

Writing costs (planning, sections): $0.36
────────────────────────────────────────
Total Estimated Cost:      $0.90
════════════════════════════════════════
```

### User Budget Awareness

At Checkpoint 2, agent informs user:
- Estimated total cost
- Cost breakdown (writing vs. images)
- Offer to switch to cheaper model if over budget

**Example:**
```
🚨 Total cost is $1.20. Would you like to:
(1) Continue with Flux Pro
(2) Use Flux Schnell instead (~$0.39 total, but lower quality)
(3) Skip images entirely (save $0.54)
(4) Cancel

Choice:
```

---

## Error Handling & Recovery

### Common Failures

**Problem: Invalid Replicate Token**
- Error: HTTP 401 Unauthorized
- Recovery: Ask user to provide valid token, retry Stage 5

**Problem: Rate Limit Exceeded**
- Error: HTTP 429 Too Many Requests
- Recovery: Wait 30–60 seconds, retry (max 3 retries)
- If persistent: Inform user, offer to resume later

**Problem: Model Not Available**
- Error: Model not found in Replicate catalog
- Recovery: Fall back to Flux Pro (default), retry

**Problem: Invalid Image Prompt**
- Error: HTTP 400 Bad Request (bad prompt)
- Recovery: Simplify prompt, retry

**Problem: Network/Connection Error**
- Error: Connection timeout, DNS failure, etc.
- Recovery: Retry up to 2 times with exponential backoff

**Problem: Generation Produces Low-Quality Image**
- Error: Image validates (WebP, dimensions correct) but quality is poor
- Recovery: Regenerate with improved prompt, retry

### Retry Strategy

For each image:
1. **First attempt:** Try once (no retry)
2. **On failure:** Retry up to 2 times with exponential backoff
   - Wait 10 seconds before retry 1
   - Wait 30 seconds before retry 2
3. **On final failure:** Mark image as failed, ask user choice (skip, cancel, retry later)

---

## Image Prompt Engineering

### Prompt Structure

Effective prompts for Flux follow this structure:

```
[Subject] [Style] [Composition] [Lighting] [Quality/Detail]
```

**Example:**
```
React Suspense architecture diagram with async boundaries, 
minimalist technical illustration, clean blue and white color palette, 
isometric 3D perspective, editorial quality, sharp focus, 
high resolution, professional rendering
```

### Do's

- ✅ Be specific about subject (React Suspense, not "tech")
- ✅ Include style guidance (technical, editorial, minimalist)
- ✅ Specify color palette (blue and white, not "colorful")
- ✅ Mention composition (isometric, side-by-side, centered)
- ✅ Include quality descriptors (high resolution, professional, sharp)

### Don'ts

- ❌ Don't use brand names (OpenAI, Apple, Google — may cause legal issues)
- ❌ Don't describe copyrighted characters or artwork
- ❌ Don't request photorealistic faces (can raise ethical concerns)
- ❌ Don't make prompts too long (>1000 chars reduces quality)

### Examples by Format

**Article cover:**
```
Minimalist, clean technical diagram showing React Suspense data flow 
with async boundaries, blue and white color palette, 3D rendered, 
editorial illustration, high quality, sharp focus
```

**Newsletter inline:**
```
Flat design icon of a spinning loading indicator with checkmark, 
friendly yet technical style, pastel blue and white, 
centered composition, clear and simple
```

**Social media:**
```
Bold, eye-catching React Suspense flow diagram, 
vibrant blue gradient, geometric shapes, modern design, 
optimized for social media sharing, 1:1 square format
```

---

## Integration Example

### Agent Code Pattern

Pseudocode for image generation stage:

```python
def generate_images(image_prompts, replicate_token, model="flux"):
    # 1. Validate token
    if not validate_replicate_token(replicate_token):
        raise Error("Invalid Replicate token")
    
    # 2. For each image
    results = []
    for prompt in image_prompts:
        # 3. Submit to Replicate
        prediction = replicate_api.call(
            model=model,
            prompt=prompt.expanded_description,
            width=1024,
            height=1024
        )
        
        # 4. Poll for completion
        while prediction.status in ["starting", "processing"]:
            time.sleep(2)
            prediction = replicate_api.get(prediction.id)
            
            # Check timeout
            if elapsed_time > 300:  # 5 minutes
                raise Timeout("Image generation timed out")
        
        # 5. Validate & save
        if prediction.status == "succeeded":
            image_url = prediction.output[0]
            image_file = download_and_convert_to_webp(image_url)
            results.append({
                "id": prompt.id,
                "path": image_file,
                "costUsd": 0.18,
                "duration": prediction.elapsed_time
            })
    
    return results
```

---

## Testing & Dry-Run

### Dry-Run Mode

For testing without incurring costs:
- Set `dryRun=true` in config
- Agent generates image prompts but does NOT call Replicate
- Images are replaced with placeholder URLs
- Useful for testing content flow without image generation

### Test Prompts

For validating workflow:
1. **Simple prompt:** "A blue circle on white background"
2. **Complex prompt:** "React Suspense data flow diagram with async boundaries..."
3. **Edge case:** Very long prompt (near 1000 chars limit)

---

## Troubleshooting Checklist

- [ ] Replicate token is valid (verified with test call)
- [ ] Model is supported (Flux Pro, Flux Schnell, or SD3)
- [ ] Image prompts are valid (10–1000 chars, English)
- [ ] Timeouts are handled gracefully (5 min per image)
- [ ] WebP conversion works (files < 500 KB)
- [ ] Cost tracking is accurate (logged per stage)
- [ ] Failed images offer retry/skip options to user
- [ ] All generated images are embedded in markdown with correct relative paths

