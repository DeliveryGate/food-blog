import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, TextField, Select, Button, Spinner, Badge,
  Toast, Frame, Text, BlockStack, InlineStack, Box, Divider,
} from "@shopify/polaris";

const FOOD_CATEGORIES = [
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

const TEMPLATE_HINTS = {
  "Nutrition":            "Evidence-based macros, micros, and how your menu supports balanced nutrition",
  "Gut Health":           "Gut-brain axis, probiotics, prebiotics, and microbiome-friendly menu choices",
  "Skin Health":          "Diet and skin clarity — antioxidants, hydration, and anti-ageing ingredients",
  "Allergens":            "The 14 major allergens, cross-contamination risks, and your allergy management process",
  "Healthy Food Choices": "Helping customers choose wisely — portion guidance, colour-coded nutrition",
  "Catering":             "Corporate and event catering — dietary diversity, volume ordering, presentation",
  "Workplace Wellbeing":  "How food impacts productivity, focus, and energy in the workplace",
  "Sport and Exercise":   "Pre/post-workout fuelling, protein, carb timing, and recovery meals",
  "Mental Health":        "Nutritional psychiatry, gut-brain connection, mood-supporting nutrients",
  "Sleep and Energy":     "Diet, sleep quality, circadian rhythms, and evening meal choices",
  "Weight and Metabolism":"Evidence-based weight management — satiety, calorie quality, sustainable habits",
  "Healthy Ageing":       "Anti-inflammatory foods, bone density, cognitive health, and longevity nutrition",
};

export default function Generate() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop") || "";

  const [topic, setTopic] = useState(params.get("topic") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState("1200");
  const [brandVoice, setBrandVoice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [post, setPost] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()).then(d => {
      setUsage(d);
      if (d.defaultTone) setTone(d.defaultTone);
      if (d.defaultWordCount) setWordCount(String(d.defaultWordCount));
      if (d.brandVoice) setBrandVoice(d.brandVoice);
    });
  }, [shop]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setPost(null);
    try {
      const res = await fetch(`/api/generate?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, wordCount: parseInt(wordCount), brandVoice, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || "Generation failed");
        if (data.upgrade) navigate(`/settings?shop=${shop}`);
        return;
      }
      setPost(data); setEditTitle(data.title); setEditMeta(data.metaDescription);
      setUsage(prev => prev ? { ...prev, used: prev.used + 1 } : prev);
    } catch (err) { setToast(err.message); }
    finally { setGenerating(false); }
  };

  const handlePublish = async () => {
    if (!post) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/publish/${post.postId}?shop=${shop}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) { setToast(data.error || "Publish failed"); return; }
      setToast("Published to Shopify blog!"); setPost(null);
    } catch (err) { setToast(err.message); }
    finally { setPublishing(false); }
  };

  const creditsLeft = usage ? (usage.plan === "enterprise" ? "Unlimited" : `${usage.limit - usage.used} credits remaining`) : "";

  return (
    <Frame>
      <Page title="Generate Post" backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <TextField
                  label="Topic / keyword"
                  value={topic}
                  onChange={setTopic}
                  placeholder="e.g. high-protein meal prep for athletes"
                  autoComplete="off"
                />

                {/* 12 category chips */}
                <BlockStack gap="200">
                  <Text variant="bodySm" as="p">Content category</Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {FOOD_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(category === cat ? "" : cat)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          border: "1.5px solid",
                          borderColor: category === cat ? "#008060" : "#c9cccf",
                          background: category === cat ? "#f0faf6" : "#fff",
                          color: category === cat ? "#008060" : "#202223",
                          fontWeight: category === cat ? 600 : 400,
                          cursor: "pointer",
                          fontSize: "13px",
                          transition: "all 0.15s",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {category && TEMPLATE_HINTS[category] && (
                    <Text variant="bodySm" tone="subdued">{TEMPLATE_HINTS[category]}</Text>
                  )}
                </BlockStack>

                <InlineStack gap="300">
                  <Box minWidth="200px">
                    <Select
                      label="Tone"
                      options={[
                        { label: "Professional", value: "professional" },
                        { label: "Friendly", value: "friendly" },
                        { label: "Educational", value: "educational" },
                        { label: "Conversational", value: "conversational" },
                        { label: "Authoritative", value: "authoritative" },
                      ]}
                      value={tone}
                      onChange={setTone}
                    />
                  </Box>
                  <Box minWidth="200px">
                    <Select
                      label="Word count"
                      options={[
                        { label: "500 words", value: "500" },
                        { label: "800 words", value: "800" },
                        { label: "1200 words", value: "1200" },
                        { label: "1500 words", value: "1500" },
                        { label: "2000 words", value: "2000" },
                      ]}
                      value={wordCount}
                      onChange={setWordCount}
                    />
                  </Box>
                </InlineStack>

                <TextField
                  label="Brand voice override (optional)"
                  value={brandVoice}
                  onChange={setBrandVoice}
                  placeholder="e.g. warm, expert, no jargon — we're a family-run halal kitchen..."
                  multiline={2}
                  autoComplete="off"
                />

                <InlineStack gap="200" blockAlign="center">
                  <Button variant="primary" loading={generating} onClick={handleGenerate} disabled={!topic.trim()}>
                    Generate post
                  </Button>
                  {usage && <Badge tone="info">{creditsLeft}</Badge>}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {generating && (
            <Layout.Section>
              <Card>
                <Box padding="800">
                  <InlineStack align="center" gap="300">
                    <Spinner size="large" />
                    <Text>Generating your food content post{category ? ` on ${category}` : ""}...</Text>
                  </InlineStack>
                </Box>
              </Card>
            </Layout.Section>
          )}

          {post && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h2">Generated Post</Text>
                    {post.category && <Badge>{post.category}</Badge>}
                  </InlineStack>
                  <TextField label="Title" value={editTitle} onChange={setEditTitle} autoComplete="off" />
                  <TextField
                    label="Meta description"
                    value={editMeta}
                    onChange={setEditMeta}
                    autoComplete="off"
                    helpText={`${editMeta.length}/155 characters`}
                  />
                  <Text variant="bodySm" tone="subdued">{post.wordCount} words | Tags: {post.tags}</Text>
                  <Divider />
                  <div dangerouslySetInnerHTML={{ __html: post.content }} style={{ lineHeight: 1.6 }} />
                  <Divider />
                  <InlineStack gap="200">
                    <Button variant="primary" loading={publishing} onClick={handlePublish}>Publish to blog</Button>
                    <Button onClick={() => { setToast("Saved as draft"); setPost(null); }}>Save draft</Button>
                    <Button onClick={handleGenerate}>Regenerate</Button>
                    <Button tone="critical" variant="plain" onClick={() => setPost(null)}>Discard</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
