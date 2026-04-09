import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, Banner, Button, Text, BlockStack, InlineStack, Badge, ProgressBar, DataTable, Spinner, Box } from "@shopify/polaris";

export default function Dashboard() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()),
      fetch(`/api/posts?shop=${shop}`).then(r => r.json()),
      fetch(`/api/calendar?shop=${shop}`).then(r => r.json()),
    ]).then(([d, p, c]) => {
      setData(d);
      setPosts(p.posts || []);
      setCalendar(c.calendar || null);
    }).finally(() => setLoading(false));
  }, [shop]);

  if (loading) return (
    <Page title="Food Blog">
      <Layout><Layout.Section>
        <Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card>
      </Layout.Section></Layout>
    </Page>
  );

  const usagePercent = data ? Math.round((data.used / Math.min(data.limit, 999999)) * 100) : 0;
  const isEnterprise = data?.plan === "enterprise";

  return (
    <Page
      title="Food Blog"
      subtitle="Health and nutrition content that drives hungry customers to your store"
      primaryAction={{ content: "Generate new post", onAction: () => navigate(`/generate?shop=${shop}`) }}
    >
      <Layout>
        {data?.plan === "free" && data?.used >= 2 && (
          <Layout.Section>
            <Banner
              title="Approaching free plan limit"
              tone="warning"
              action={{ content: "Upgrade plan", onAction: () => navigate(`/settings?shop=${shop}`) }}
            >
              You have {data.limit - data.used} post{data.limit - data.used === 1 ? "" : "s"} remaining this month.
            </Banner>
          </Layout.Section>
        )}

        {!data?.reviewDismissed && posts.filter(p => p.status === "published").length >= 3 && (
          <Layout.Section>
            <Banner
              title="Enjoying Food Blog?"
              tone="info"
              action={{ content: "Leave a review", url: "https://apps.shopify.com" }}
              onDismiss={() => fetch(`/api/settings?shop=${shop}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewDismissed: true }),
              })}
            >
              Your food blog is growing! A quick review helps other food businesses discover this app.
            </Banner>
          </Layout.Section>
        )}

        {/* Stats row */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Credits This Month</Text>
              <ProgressBar progress={isEnterprise ? 0 : usagePercent} size="small" />
              <Text variant="bodySm">
                {isEnterprise ? "Unlimited" : `${data?.used || 0} / ${data?.limit || 3} used`}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Plan</Text>
              <Badge tone={data?.plan === "enterprise" ? "success" : data?.plan === "pro" ? "success" : data?.plan === "starter" ? "info" : undefined}>
                {data?.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : "Free"}
              </Badge>
              {data?.businessType && (
                <Text variant="bodySm" tone="subdued">
                  {data.businessType.charAt(0).toUpperCase() + data.businessType.slice(1).replace("-", " ")}
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Total Published</Text>
              <Text variant="headingXl" as="p">{posts.filter(p => p.status === "published").length}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent posts */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">Recent Posts</Text>
              {posts.length === 0 ? (
                <BlockStack gap="200">
                  <Text tone="subdued">No posts yet. Generate your first food content post!</Text>
                  <Button variant="primary" onClick={() => navigate(`/generate?shop=${shop}`)}>Generate first post</Button>
                </BlockStack>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "text"]}
                  headings={["Title", "Category", "Status", "Words", "Date"]}
                  rows={posts.slice(0, 5).map(p => [
                    p.title,
                    p.category || "—",
                    p.status === "published" ? "Published" : "Draft",
                    p.wordCount,
                    new Date(p.createdAt).toLocaleDateString("en-GB"),
                  ])}
                />
              )}
              {posts.length > 5 && (
                <Button variant="plain" onClick={() => navigate(`/posts?shop=${shop}`)}>View all posts</Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Seasonal content calendar */}
        {calendar && calendar.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" as="h2">Seasonal Content Calendar</Text>
                  <Badge tone="info">AI suggested</Badge>
                </InlineStack>
                <Text tone="subdued" variant="bodySm">Upcoming content ideas tailored to your food business</Text>
                {calendar.map(({ month, suggestions }) => (
                  <BlockStack gap="200" key={month}>
                    <Text variant="headingSm" as="h3">{month}</Text>
                    {suggestions.map((s, i) => (
                      <InlineStack key={i} gap="200" blockAlign="center">
                        <Badge tone={s.priority === "high" ? "warning" : undefined}>{s.category}</Badge>
                        <Button
                          variant="plain"
                          onClick={() => navigate(`/generate?shop=${shop}&topic=${encodeURIComponent(s.topic)}&category=${encodeURIComponent(s.category)}`)}
                        >
                          {s.topic}
                        </Button>
                      </InlineStack>
                    ))}
                  </BlockStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
