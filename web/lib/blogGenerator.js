import { PrismaClient } from "@prisma/client";
import { generateWithOpenAI } from "./openai.js";
import { shopifyGraphQL } from "../shopify.js";

const prisma = new PrismaClient();

// ---- Food business competitor filter ----
const COMPETITOR_NAMES = [
  "Amazon", "eBay", "Etsy", "Walmart", "Target", "AliExpress", "Wish",
  "Tesco", "Sainsbury", "ASDA", "Aldi", "Lidl", "Ocado", "HelloFresh",
  "Gousto", "Abel & Cole", "Mindful Chef", "Green Chef", "Marley Spoon",
  "Deliveroo", "Uber Eats", "Just Eat",
];

// ---- 12 canonical food content categories ----
export const FOOD_CATEGORIES = [
  "Nutrition",
  "Gut Health",
  "Skin Health",
  "Allergens",
  "Healthy Food Choices",
  "Catering",
  "Workplace Wellbeing",
  "Sport and Exercise",
  "Mental Health",
  "Sleep and Energy",
  "Weight and Metabolism",
  "Healthy Ageing",
];

// ---- Business type labels ----
export const BUSINESS_TYPES = {
  restaurant:  "Restaurant",
  cafe:        "Cafe",
  caterer:     "Caterer",
  "meal-prep": "Meal Prep Service",
  bakery:      "Bakery",
};

// ---- Dietary certification labels ----
export const DIETARY_CERTS = [
  "halal",
  "gluten-free",
  "vegan",
  "kosher",
  "nut-free",
];

// ---- Category-specific prompt templates ----
const CATEGORY_TEMPLATES = {
  "Nutrition": (businessType, certs) => `Focus on evidence-based nutritional science. Explain macronutrients, micronutrients, and how the food offerings support balanced nutrition. ${certs.length ? `Reference ${certs.join(", ")} dietary options where relevant.` : ""}`,
  "Gut Health": (businessType, certs) => `Cover the gut-brain axis, prebiotics, probiotics, and how menu choices support a healthy microbiome. Include specific dish or ingredient examples from the product catalog.`,
  "Skin Health": () => `Explain the link between diet and skin clarity, hydration, and anti-ageing. Highlight antioxidant-rich ingredients and how they support skin health.`,
  "Allergens": (businessType, certs) => `Provide clear, factual allergen guidance. Cover the 14 major allergens, cross-contamination risks, and how ${BUSINESS_TYPES[businessType] || "this business"} handles allergen management. ${certs.includes("gluten-free") ? "Highlight gluten-free options." : ""} ${certs.includes("nut-free") ? "Highlight nut-free options." : ""}`,
  "Healthy Food Choices": (businessType, certs) => `Help customers make informed, healthier food choices. Use colour-coded nutrition, portion guidance, and highlight ${certs.length ? certs.join(", ") + " options" : "wholefood options"} from the menu.`,
  "Catering": (businessType) => `Cover corporate and event catering considerations: dietary diversity, volume ordering, presentation, and how ${BUSINESS_TYPES[businessType] || "this business"} serves group needs.`,
  "Workplace Wellbeing": () => `Explore how food impacts workplace productivity, focus, and energy levels. Link nutrition to employee wellbeing initiatives and healthy canteen or catering choices.`,
  "Sport and Exercise": (businessType, certs) => `Cover sports nutrition: pre- and post-workout fuelling, protein requirements, carbohydrate timing, and recovery meals. Reference specific menu items that support athletic performance.`,
  "Mental Health": () => `Explore the emerging science of nutritional psychiatry — the gut-brain connection, mood-supporting nutrients (omega-3s, B vitamins, magnesium), and how food choices affect mental wellbeing.`,
  "Sleep and Energy": () => `Explain how diet affects sleep quality, circadian rhythms, and daytime energy. Cover sleep-supporting foods, avoiding stimulants, and evening meal choices.`,
  "Weight and Metabolism": (businessType, certs) => `Provide evidence-based guidance on metabolism, calorie quality vs. quantity, satiety, and sustainable weight management through food. Avoid diet culture language. ${certs.includes("gluten-free") || certs.includes("vegan") ? `Highlight ${certs.filter(c => ["gluten-free","vegan"].includes(c)).join(" and ")} options.` : ""}`,
  "Healthy Ageing": () => `Cover nutrition for longevity: anti-inflammatory foods, bone density, cognitive health, and how dietary patterns support healthy ageing and vitality into later life.`,
};

// ---- Fetch and cache Shopify product catalog ----
export async function fetchProductContext(shop, accessToken) {
  const cached = await prisma.productCache.findUnique({ where: { shop } });
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < 3600000) {
    return JSON.parse(cached.products);
  }

  const query = `
    query { products(first: 50, sortKey: BEST_SELLING) {
      edges { node { title description handle productType tags } }
    }}
  `;
  const result = await shopifyGraphQL(shop, accessToken, query);
  const products = result.data.products.edges.map(({ node }) => ({
    title: node.title,
    description: (node.description || "").slice(0, 150),
    handle: node.handle,
    productType: node.productType,
    tags: node.tags,
  }));

  await prisma.productCache.upsert({
    where: { shop },
    create: { shop, products: JSON.stringify(products), cachedAt: new Date() },
    update: { products: JSON.stringify(products), cachedAt: new Date() },
  });

  return products;
}

// ---- Build food-specific prompt ----
export function buildPrompt(topic, products, tone, wordCount, brandVoice, businessType = "restaurant", dietaryCertifications = [], category = "") {
  const productList = products.map(p => `- ${p.title}: ${p.description} (${p.productType})`).join("\n");
  const certs = Array.isArray(dietaryCertifications) ? dietaryCertifications : JSON.parse(dietaryCertifications || "[]");
  const businessLabel = BUSINESS_TYPES[businessType] || "food business";
  const categoryGuidance = category && CATEGORY_TEMPLATES[category] ? CATEGORY_TEMPLATES[category](businessType, certs) : "";
  const certText = certs.length > 0 ? `\nDIETARY CERTIFICATIONS: This business is certified ${certs.join(", ")}. Highlight these where relevant.` : "";

  return `You are writing a blog post for a ${businessLabel} on Shopify.

BUSINESS CONTEXT:
- Business type: ${businessLabel}
- Content category: ${category || "General Food Content"}${certText}

PRODUCT / MENU CATALOG (only reference these items — never mention competitors, other brands, or products not in this store):
${productList || "No products listed — write general content appropriate for this food business."}

TASK: Write a ${wordCount}-word health and nutrition blog post about: ${topic}

TONE: ${tone}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ""}
${categoryGuidance ? `\nCATEGORY GUIDANCE:\n${categoryGuidance}` : ""}

REQUIREMENTS:
- Include 2-4 natural references to the menu items above (if available)
- Never mention competitor food brands, delivery platforms, or products not in this store
- Write a compelling meta description (max 155 characters)
- Structure with H2 and H3 headings using HTML tags
- Include an FAQ section with 3-4 common questions
- Use direct factual statements that AI search engines (ChatGPT, Perplexity, Google AI Overviews) can extract as authoritative answers
- Optimise for AEO (Answer Engine Optimisation) and GEO (Generative Engine Optimisation)
- Use the target keyword "${topic}" naturally throughout
- Include a clear, actionable conclusion that links back to the business

Return a JSON object with these exact keys:
{
  "title": "Blog post title",
  "metaDescription": "155 char max meta description",
  "content": "Full HTML content with h2, h3, p, ul, li tags",
  "tags": "comma-separated tags",
  "slug": "url-friendly-slug"
}

Return ONLY valid JSON, no markdown code fences.`;
}

// ---- Parse and validate AI output ----
export async function generatePost(prompt) {
  const raw = await generateWithOpenAI(prompt);

  let parsed;
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }

  if (!parsed.title || !parsed.metaDescription || !parsed.content) {
    throw new Error("AI response missing required fields (title, metaDescription, content)");
  }

  parsed.content = competitorFilter(parsed.content);
  parsed.wordCount = parsed.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  parsed.generatedAt = new Date().toISOString();

  return parsed;
}

// ---- Publish to Shopify blog ----
export async function publishToShopify(shop, accessToken, blogId, post, publish = true) {
  const mutation = `
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id handle }
        userErrors { field message }
      }
    }
  `;

  if (!blogId) {
    const blogsResult = await shopifyGraphQL(shop, accessToken, `query { blogs(first: 1) { edges { node { id } } } }`);
    blogId = blogsResult.data.blogs.edges[0]?.node?.id;
    if (!blogId) throw new Error("No blog found — create a blog in Shopify admin first");
  }

  const result = await shopifyGraphQL(shop, accessToken, mutation, {
    article: {
      blogId,
      title: post.title,
      body: post.content,
      summary: post.metaDescription,
      tags: post.tags.split(",").map(t => t.trim()),
      handle: post.slug,
      published: publish,
    },
  });

  const errors = result.data.articleCreate.userErrors;
  if (errors.length > 0) throw new Error(errors.map(e => e.message).join(", "));

  const article = result.data.articleCreate.article;
  return {
    id: article.id,
    url: `https://${shop}/blogs/news/${article.handle}`,
    published: publish,
  };
}

// ---- Seasonal content calendar ----
export function buildContentCalendar(businessType = "restaurant", selectedCategories = []) {
  const month = new Date().getMonth(); // 0-indexed
  const seasons = [
    { name: "January", themes: ["New Year nutrition reset", "Dry January alternatives", "Immune boosting winter meals"] },
    { name: "February", themes: ["Valentine's dining", "Heart health awareness", "Gut health month"] },
    { name: "March", themes: ["Spring detox recipes", "Mother's Day catering", "Nutrition month"] },
    { name: "April", themes: ["Easter feasting and fasting", "Spring allergen awareness", "Ramadan iftar ideas"] },
    { name: "May", themes: ["Mental Health Awareness Week food", "Coeliac Awareness Month", "Summer prep nutrition"] },
    { name: "June", themes: ["Hydration and summer eating", "Pride celebrations catering", "Sport season fuelling"] },
    { name: "July", themes: ["BBQ and outdoor catering", "Holiday nutrition tips", "Summer skin health diet"] },
    { name: "August", themes: ["Back-to-school lunch ideas", "Late summer harvest", "Energy for the school run"] },
    { name: "September", themes: ["Autumn immune support", "World Heart Day", "Workplace wellbeing refresh"] },
    { name: "October", themes: ["Halloween party catering", "World Mental Health Day", "Stoptober nutrition"] },
    { name: "November", themes: ["Bonfire Night recipes", "Movember men's health nutrition", "Festive prep catering"] },
    { name: "December", themes: ["Christmas party catering", "Festive allergen guidance", "Healthy festive eating"] },
  ];

  const upcoming = [];
  for (let i = 0; i < 3; i++) {
    const idx = (month + i) % 12;
    upcoming.push(seasons[idx]);
  }

  const categories = selectedCategories.length > 0 ? selectedCategories : FOOD_CATEGORIES.slice(0, 4);

  return upcoming.map(({ name, themes }) => ({
    month: name,
    suggestions: themes.map((theme, i) => ({
      topic: theme,
      category: categories[i % categories.length],
      priority: i === 0 ? "high" : "medium",
    })),
  }));
}

// ---- Competitor filter ----
export function competitorFilter(content) {
  let filtered = content;
  const replacements = [];

  for (const name of COMPETITOR_NAMES) {
    const regex = new RegExp(`\\b${name}\\b`, "gi");
    if (regex.test(filtered)) {
      replacements.push(name);
      filtered = filtered.replace(regex, "our kitchen");
    }
  }

  if (replacements.length > 0) {
    console.log(`[competitor-filter] Replaced mentions of: ${replacements.join(", ")}`);
  }

  return filtered;
}
