import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Card, DataTable, Badge, Button, Pagination, Tabs, Toast,
  Frame, Text, BlockStack, InlineStack, Box, TextField, Select,
} from "@shopify/polaris";

const FOOD_CATEGORIES = [
  "All categories",
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

export default function Posts() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tabIdx, setTabIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [toast, setToast] = useState(null);

  const statuses = [null, "draft", "published"];
  const tabs = [
    { id: "all", content: "All" },
    { id: "draft", content: "Draft" },
    { id: "published", content: "Published" },
  ];

  const fetchPosts = useCallback(async () => {
    const qp = new URLSearchParams({ shop, page: String(page) });
    if (statuses[tabIdx]) qp.set("status", statuses[tabIdx]);
    if (categoryFilter && categoryFilter !== "All categories") qp.set("category", categoryFilter);
    const res = await fetch(`/api/posts?${qp}`);
    const data = await res.json();
    setPosts(data.posts || []); setTotal(data.total || 0);
  }, [shop, page, tabIdx, categoryFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts/${id}?shop=${shop}`, { method: "DELETE" });
    setToast("Post deleted"); fetchPosts();
  };

  const handlePublish = async (id) => {
    const res = await fetch(`/api/publish/${id}?shop=${shop}`, { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) { setToast(data.error || "Publish failed"); return; }
    setToast("Published to Shopify blog!"); fetchPosts();
  };

  const filtered = posts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  const rows = filtered.map(p => [
    p.title,
    p.category ? <Badge>{p.category}</Badge> : <Text tone="subdued">—</Text>,
    p.status === "published" ? <Badge tone="success">Published</Badge> : <Badge tone="info">Draft</Badge>,
    p.wordCount,
    new Date(p.createdAt).toLocaleDateString("en-GB"),
    <InlineStack gap="100" key={p.id}>
      {p.shopifyUrl && <Button size="slim" url={p.shopifyUrl} external>View</Button>}
      {p.status === "draft" && <Button size="slim" onClick={() => handlePublish(p.id)}>Publish</Button>}
      <Button size="slim" tone="critical" onClick={() => handleDelete(p.id)}>Delete</Button>
    </InlineStack>,
  ]);

  return (
    <Frame>
      <Page
        title="Posts"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={{ content: "Generate new", onAction: () => navigate(`/generate?shop=${shop}`) }}
      >
        <Card>
          <BlockStack gap="400">
            <Tabs tabs={tabs} selected={tabIdx} onSelect={(i) => { setTabIdx(i); setPage(1); }} />
            <InlineStack gap="300">
              <Box minWidth="260px">
                <TextField
                  label="Search"
                  labelHidden
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by title..."
                  clearButton
                  onClearButtonClick={() => setSearch("")}
                  autoComplete="off"
                />
              </Box>
              <Box minWidth="220px">
                <Select
                  label="Category"
                  labelHidden
                  options={FOOD_CATEGORIES.map(c => ({ label: c, value: c }))}
                  value={categoryFilter}
                  onChange={(v) => { setCategoryFilter(v); setPage(1); }}
                />
              </Box>
            </InlineStack>
            <DataTable
              columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
              headings={["Title", "Category", "Status", "Words", "Created", "Actions"]}
              rows={rows}
            />
            <Text variant="bodySm" tone="subdued">{total} post{total !== 1 ? "s" : ""} total</Text>
            <InlineStack align="center">
              <Pagination
                hasPrevious={page > 1}
                hasNext={page * 20 < total}
                onPrevious={() => setPage(page - 1)}
                onNext={() => setPage(page + 1)}
              />
            </InlineStack>
          </BlockStack>
        </Card>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
