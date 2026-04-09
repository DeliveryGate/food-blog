# Food Blog — AI Content for Food Businesses

**Health and nutrition content that drives hungry customers to your store**

Generates AEO/GEO-optimised food and nutrition blog posts using the merchant's own menu and product catalog as context. Prevents competitor mentions. Supports 12 specialist food content categories. Posts publish directly to Shopify's native blog engine.

Built and proven in production at Vanda's Kitchen, a food business in the City of London supplying Selfridges, Accenture, Red Bull, and Epic Games. Every feature exists because we needed it ourselves and couldn't find it anywhere else on Shopify.

## Architecture

- **Backend** (`web/index.js`) — Express server with generation engine, billing, GDPR webhooks, content calendar
- **Food Generator** (`web/lib/blogGenerator.js`) — 12 food categories, food-specific prompt templates, competitor filter, seasonal calendar
- **OpenAI Integration** (`web/lib/openai.js`) — GPT-4o-mini with retry logic and token tracking
- **Admin Frontend** (`web/frontend/`) — React + Polaris (dashboard, generator with category chips, post manager, settings)
- **Database** — PostgreSQL via Prisma (posts, usage, product cache, merchant settings)

## Food Content Categories

1. Nutrition
2. Gut Health
3. Skin Health
4. Allergens
5. Healthy Food Choices
6. Catering
7. Workplace Wellbeing
8. Sport and Exercise
9. Mental Health
10. Sleep and Energy
11. Weight and Metabolism
12. Healthy Ageing

## Environment Variables

```
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_content,read_products,write_content
SHOPIFY_APP_URL=https://food-blog.railway.app
DATABASE_URL=postgresql://
DIRECT_URL=postgresql://
OPENAI_API_KEY=
NODE_ENV=production
PORT=3000
```

## Billing (USD)

| Plan       | Price       | Posts/month |
|------------|-------------|-------------|
| Free       | $0          | 3           |
| Starter    | $14/month   | 50          |
| Pro        | $29/month   | 150         |
| Enterprise | $59/month   | Unlimited   |

## App Store Listing

**Name:** Food Blog — AI Content for Food Businesses
**Tagline:** Health and nutrition content that drives hungry customers to your store

**Developer:** SaltCore
**Portfolio:** saltai.app
**Support:** support@saltai.app

**Key Benefits:**
- Food-context AI writing — uses your actual menu so posts only reference your dishes, never competitors
- 12 specialist content categories — from Gut Health to Allergens to Workplace Wellbeing
- AEO/GEO optimised — structured for AI search engines (ChatGPT, Perplexity, Google AI Overviews)
- Dietary certification support — halal, gluten-free, vegan, kosher, nut-free context baked in
- Seasonal content calendar — AI-suggested topics aligned to food industry moments
- One-click Shopify publishing — directly to your native blog, no lock-in

## GDPR Webhooks

- `app/uninstalled` — full data deletion
- `shop/redact` — full shop data deletion
- `customers/redact` — logged (no customer PII stored)
- `customers/data_request` — logged (no customer PII stored)
