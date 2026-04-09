import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, TextField, Select, ChoiceList, Button, Badge,
  Toast, Frame, Text, BlockStack, InlineStack, ProgressBar, Box,
} from "@shopify/polaris";

const PLANS = {
  free:       { name: "Free",       price: 0,  limit: 3,        features: ["3 posts/month", "All tones", "No credit card needed"] },
  starter:    { name: "Starter",    price: 14, limit: 50,       features: ["50 posts/month", "All 12 food categories", "Email support"] },
  pro:        { name: "Pro",        price: 29, limit: 150,      features: ["150 posts/month", "All features", "Brand voice memory", "Content calendar"] },
  enterprise: { name: "Enterprise", price: 59, limit: "Unlimited", features: ["Unlimited posts/month", "All features", "Priority support", "Custom brand voice"] },
};

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

const DIETARY_CERTS = [
  { label: "Halal certified", value: "halal" },
  { label: "Gluten-free certified", value: "gluten-free" },
  { label: "Vegan certified", value: "vegan" },
  { label: "Kosher certified", value: "kosher" },
  { label: "Nut-free kitchen", value: "nut-free" },
];

export default function Settings() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [data, setData] = useState(null);

  // General prefs
  const [brandVoice, setBrandVoice] = useState("");
  const [defaultTone, setDefaultTone] = useState("professional");
  const [defaultWordCount, setDefaultWordCount] = useState("1200");
  const [autoPublish, setAutoPublish] = useState(false);

  // Food-specific
  const [businessType, setBusinessType] = useState("restaurant");
  const [dietaryCertifications, setDietaryCertifications] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [contentCalendarEnabled, setContentCalendarEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()).then(d => {
      setData(d);
      setBrandVoice(d.brandVoice || "");
      setDefaultTone(d.defaultTone || "professional");
      setDefaultWordCount(String(d.defaultWordCount || 1200));
      setAutoPublish(d.autoPublish || false);
      setBusinessType(d.businessType || "restaurant");
      setDietaryCertifications(d.dietaryCertifications || []);
      setSelectedCategories(d.selectedCategories || []);
      setContentCalendarEnabled(d.contentCalendarEnabled || false);
    });
  }, [shop]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/settings?shop=${shop}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandVoice, defaultTone, defaultWordCount: parseInt(defaultWordCount), autoPublish,
        businessType, dietaryCertifications, selectedCategories, contentCalendarEnabled,
      }),
    });
    setSaving(false); setToast("Settings saved");
  };

  const handleSubscribe = async (plan) => {
    setSubscribing(plan);
    const res = await fetch(`/api/billing/subscribe?shop=${shop}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const d = await res.json();
    setSubscribing(null);
    if (d.confirmationUrl) window.top.location.href = d.confirmationUrl;
    else setToast(d.error || "Failed to start subscription");
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  if (!data) return (
    <Page title="Settings">
      <Card><Box padding="400"><Text>Loading...</Text></Box></Card>
    </Page>
  );

  const isEnterprise = data.plan === "enterprise";

  return (
    <Frame>
      <Page title="Settings" backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}>
        <Layout>
          {/* Business profile */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Business Profile</Text>
                <Select
                  label="Business type"
                  options={[
                    { label: "Restaurant", value: "restaurant" },
                    { label: "Cafe", value: "cafe" },
                    { label: "Caterer", value: "caterer" },
                    { label: "Meal Prep Service", value: "meal-prep" },
                    { label: "Bakery", value: "bakery" },
                  ]}
                  value={businessType}
                  onChange={setBusinessType}
                  helpText="Used to tailor content to your specific food business context"
                />
                <Text variant="bodySm" as="p">Dietary certifications</Text>
                <ChoiceList
                  title=""
                  allowMultiple
                  choices={DIETARY_CERTS}
                  selected={dietaryCertifications}
                  onChange={setDietaryCertifications}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Content categories */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Content Categories</Text>
                <Text variant="bodySm" tone="subdued">
                  Select your priority categories. These are used to suggest content and filter the calendar.
                </Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {FOOD_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1.5px solid",
                        borderColor: selectedCategories.includes(cat) ? "#008060" : "#c9cccf",
                        background: selectedCategories.includes(cat) ? "#f0faf6" : "#fff",
                        color: selectedCategories.includes(cat) ? "#008060" : "#202223",
                        fontWeight: selectedCategories.includes(cat) ? 600 : 400,
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Text variant="bodySm" tone="subdued">
                  {selectedCategories.length === 0 ? "No categories selected — all 12 will be available" : `${selectedCategories.length} of 12 selected`}
                </Text>
                <ChoiceList
                  title=""
                  choices={[{ label: "Enable seasonal content calendar on dashboard", value: "calendar" }]}
                  selected={contentCalendarEnabled ? ["calendar"] : []}
                  onChange={(v) => setContentCalendarEnabled(v.includes("calendar"))}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Writing preferences */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Writing Preferences</Text>
                <TextField
                  label="Brand voice"
                  value={brandVoice}
                  onChange={setBrandVoice}
                  multiline={3}
                  placeholder="e.g. Warm and expert. We're a halal kitchen in London. No jargon. Speak to busy professionals."
                  autoComplete="off"
                  helpText="This is injected into every post prompt to keep your voice consistent"
                />
                <Select
                  label="Default tone"
                  options={[
                    { label: "Professional", value: "professional" },
                    { label: "Friendly", value: "friendly" },
                    { label: "Educational", value: "educational" },
                    { label: "Conversational", value: "conversational" },
                    { label: "Authoritative", value: "authoritative" },
                  ]}
                  value={defaultTone}
                  onChange={setDefaultTone}
                />
                <Select
                  label="Default word count"
                  options={[
                    { label: "500 words", value: "500" },
                    { label: "800 words", value: "800" },
                    { label: "1200 words", value: "1200" },
                    { label: "1500 words", value: "1500" },
                    { label: "2000 words", value: "2000" },
                  ]}
                  value={defaultWordCount}
                  onChange={setDefaultWordCount}
                />
                <ChoiceList
                  title=""
                  choices={[{ label: "Auto-publish posts directly to blog (skip draft review)", value: "auto" }]}
                  selected={autoPublish ? ["auto"] : []}
                  onChange={(v) => setAutoPublish(v.includes("auto"))}
                />
                <Button variant="primary" loading={saving} onClick={handleSave}>Save settings</Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Usage */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" as="h2">Usage</Text>
                  <Badge tone={data.plan === "enterprise" ? "success" : data.plan === "pro" ? "success" : data.plan === "starter" ? "info" : undefined}>
                    {data.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : "Free"}
                  </Badge>
                </InlineStack>
                {isEnterprise ? (
                  <Text>Unlimited posts — Enterprise plan</Text>
                ) : (
                  <>
                    <Text>{data.used} / {data.limit} posts this month</Text>
                    <ProgressBar progress={Math.round((data.used / data.limit) * 100)} size="small" />
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Plans */}
          <Layout.Section>
            <Text variant="headingMd" as="h2">Plans</Text>
          </Layout.Section>
          {Object.entries(PLANS).map(([key, plan]) => (
            <Layout.Section variant="oneThird" key={key}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h3">{plan.name}</Text>
                    {key === data.plan && <Badge tone="success">Current</Badge>}
                  </InlineStack>
                  <Text variant="headingXl">
                    {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    {typeof plan.limit === "number" ? `${plan.limit} posts/month` : "Unlimited posts/month"}
                  </Text>
                  {plan.features.map(f => (
                    <Text key={f} variant="bodySm">{f}</Text>
                  ))}
                  {key !== "free" && key !== data.plan && (
                    <Button variant="primary" loading={subscribing === key} onClick={() => handleSubscribe(key)}>
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
