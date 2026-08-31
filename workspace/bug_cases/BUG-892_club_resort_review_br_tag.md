# BUG-892: Club/Resort Review Displays Literal `<BR>` Tags When Switching Languages

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-04
> **Date Fixed:** 2026-08-04
> **Project:** SSL (ssl-fe-user, ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

When switching languages (e.g. Danish, German, French, Portuguese, Spanish, etc.), club and resort reviews, dress codes, rating reasons, and hotel descriptions display literal `<BR>` or `<br>` text on screen instead of rendering actual line breaks.

## 🔄 Reproduction Steps

1. Navigate to a Destination detail page (e.g., `/clubs/tucan-club` or `/clubs/cap-d-agde`).
2. Switch language from English to Danish (`da`), German (`de`), French (`fr`), or Portuguese (`pt`).
3. Scroll to the rating reasons, dress codes, or hotel descriptions.

**Expected behavior:** Text renders with proper paragraphs and visual line breaks.
**Actual behavior:** Text renders with literal string `<BR>` or `<br>` inserted throughout paragraphs.

## 📸 Evidence

```
d.womenDressCode.pt: "Durante o dia: Nua ou de biquíni e chinelos de praia.<br>Jantar: Calças elegantes com camisa ou polo"
d.facilitiesRating.reason.da: '{"root":{"children":[{"children":[{"text":"Facilite...<br>..."}]}]}}'
```

## 🔭 Tracing Evidence

N/A — Visual frontend / translated content rendering issue.

## 📊 PostHog Evidence

N/A — Superthread issue #892.

## 🧠 Root Cause Analysis

1. **Translation Output**: OpenAI translation converts newlines in long text fields into `<br>` / `<BR>` tags.
2. **Lexical JSON Escaping**: When `LexicalContent` parses Lexical JSON, translated text inside text nodes (e.g., `text: "Badetøj...<br>Middag..."`) is rendered into React string text nodes (`<span>{node.text}</span>`). React escapes `<br>` into `&lt;br&gt;`, displaying literal `<br>` or `<BR>` on screen inside Lexical paragraphs.
3. **Raw JSX Escaping**: Plain string fields (`womenDressCode`, `menDressCode`, `hotel.description`) were rendered directly inside JSX `{text}` tags without parsing line breaks, displaying `<br>`/`<BR>` as literal text.
4. **Database State**: 20 out of 27 destination documents in MongoDB had saved translated fields containing literal `<br>` / `<BR>` / `&lt;br&gt;` strings.

**Related files:**
- [lexical-renderer.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/lexical-renderer.tsx)
- [destination.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/destination/destination.page.tsx)
- [line-break.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/line-break.ts)
- [translation.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/translation/translation.service.ts)
- [clean-br-tags-in-destinations.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/scripts/clean-br-tags-in-destinations.ts)

## 🔧 Fix Applied

1. **Frontend Renderer**:
   - Added `splitTextByBR` and `normalizeHtmlBR` in `line-break.ts`.
   - Updated `renderTextNode` in `lexical-renderer.tsx` to split text nodes containing `<br>`, `<BR>`, `<br/>`, `&lt;br&gt;`, `&lt;BR&gt;` into React `<br />` elements.
   - Updated `LexicalContent` to normalize non-Lexical HTML string values before passing to `dangerouslySetInnerHTML`.
   - Replaced direct JSX `{text}` rendering of `womenDressCode`, `menDressCode`, and `hotel.description` in `destination.page.tsx` with `<LexicalContent />`.

2. **Backend & Database**:
   - Added `sanitizeBrTags` helper in `translation.service.ts` to sanitize future translation API outputs.
   - Executed `clean-br-tags-in-destinations.ts` database script to clean 20 affected destination documents in MongoDB.

## 🧪 Unit / Regression Test

- **Test File:** [line-break.unit.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/line-break.unit.test.ts)
- **Command:** `pnpm --filter ssl-fe-user exec vitest run src/shared/util/line-break.unit.test.ts`
- **Test Results:** 5/5 passed cleanly.

## 📝 Lessons Learned

- Translated text fields from LLMs often mix HTML `<br>` tags and text content inside JSON nodes.
- React string interpolation `{str}` escapes all HTML tags. Any rich text or multi-line translated content must go through a renderer component like `<LexicalContent />` that handles line break splitting.
