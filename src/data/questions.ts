export type Classification = 'new' | 'inaccurate' | 'accurate' | 'regression';
export type Source = 'Manual' | 'Feedback' | 'AI Generated';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AgentResponse {
  summary: string;
  followUp: string;
  sql: string;
  chartData: ChartPoint[];
  chartYAxisLabel: string;
  chartXAxisLabel: string;
}

export interface Question {
  id: string;
  text: string;
  source: Source;
  thumbsUp: number;
  thumbsDown: number;
  semanticModel: string;
  lastModified: string;
  classification: Classification;
  response: AgentResponse;
  correction?: string;
  suggestedCorrection?: string;
}

const ordersSql = `WITH ranked_products AS (
  SELECT
    pipeline_Value,
    total_sales_amount,
    ROW_NUMBER() OVER (
      ORDER BY
        total_sales_amount DESC NULLS LAST,
        product_name
    ) AS rn
  FROM
    SEMANTIC_VIEW(
      'sales_extended',
      DIMENSIONS
        Goods_Product.Product_Name AS product_name,
      MEASURES
        SUM(Opportunity_Product.Total_Price_Amount)
          AS total_sales_amount,
      WHERE
        LOWER(Opportunity.Won) = 'true'
        AND LOWER(Opportunity.Closed) = 'true'
        AND Opportunity.Close_Date >=
          DATE_TRUNC('quarter', CURRENT_DATE)
          + INTERVAL '3 months'
        AND Opportunity.Close_Date <
          DATE_TRUNC('quarter', CURRENT_DATE)
          + INTERVAL '6 months'
    )
)
SELECT
  product_name AS "ProductName__c",
  total_sales_amount AS "TotalSalesAmt__c"
FROM
  ranked_products
WHERE
  rn = 1
ORDER BY
  total_sales_amount DESC
LIMIT 25
OFFSET 0;

-- Validated against production data
-- Last verified: 04/22/2025
-- Reviewer: Harry Anderson
-- Confidence: High`;

const leadConversionSql = `SELECT
  source,
  AVG(conversion_rate) AS avg_conversion,
  COUNT(*) AS lead_count
FROM
  SEMANTIC_VIEW(
    'lead_funnel',
    DIMENSIONS Lead.Source AS source,
    MEASURES AVG(Lead.Conversion_Rate)
  )
WHERE
  created_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
  AND created_date < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY
  source
ORDER BY
  avg_conversion DESC;`;

const salesAmountSql = `SELECT
  opportunity_type,
  SUM(amount) AS total_sales_amount,
  COUNT(*) AS won_deals
FROM
  SEMANTIC_VIEW(
    'sales_extended',
    DIMENSIONS Opportunity.Type AS opportunity_type,
    MEASURES SUM(Opportunity.Amount)
  )
WHERE
  stage_name = 'Closed Won'
GROUP BY
  opportunity_type
ORDER BY
  total_sales_amount DESC;`;

const dealSizeSql = `WITH bucketed AS (
  SELECT
    CASE WHEN customer_type = 'New' THEN 'New Business' ELSE 'Existing' END AS segment,
    amount
  FROM SEMANTIC_VIEW(
    'sales_extended',
    DIMENSIONS Account.Customer_Type AS customer_type,
    MEASURES AVG(Opportunity.Amount)
  )
)
SELECT
  segment,
  AVG(amount) AS avg_deal_size,
  COUNT(*) AS deal_count
FROM bucketed
GROUP BY segment;`;

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'Show me total orders by month',
    source: 'Manual',
    thumbsUp: 8,
    thumbsDown: 2,
    semanticModel: 'C360',
    lastModified: '24 minutes ago',
    classification: 'new',
    suggestedCorrection:
      "The agent grouped by created_date instead of order_date, which excludes back-dated orders.",
    response: {
      summary:
        'I found a table called Orders, and here is the Total Orders by Month.',
      followUp:
        'Would you like to make any changes? You can preview the Orders table, add other data tables, or change the visualization. Or investigate something different.',
      sql: ordersSql,
      chartYAxisLabel: 'Total Orders',
      chartXAxisLabel: 'Month',
      chartData: [
        { label: 'Jan', value: 38 },
        { label: 'Feb', value: 42 },
        { label: 'Mar', value: 49 },
        { label: 'Apr', value: 45 },
        { label: 'May', value: 51 },
        { label: 'Jun', value: 47 },
        { label: 'Jul', value: 50 },
        { label: 'Aug', value: 52 },
        { label: 'Sep', value: 48 },
        { label: 'Oct', value: 35 },
      ],
    },
  },
  {
    id: 'q2',
    text: 'Compare lead conversion rate in the prior month for different sources, when responding I do not want to include leads from referrals',
    source: 'Feedback',
    thumbsUp: 1,
    thumbsDown: 0,
    semanticModel: 'C360',
    lastModified: '12 hours ago',
    classification: 'new',
    suggestedCorrection:
      "Referral leads were included in the result — the prompt explicitly asked to exclude them.",
    response: {
      summary:
        'Here is the lead conversion rate by source for the prior month. Referral leads were excluded as requested.',
      followUp:
        'The Web and Partner sources had the highest conversion. Want me to filter by region or split by sales rep?',
      sql: leadConversionSql,
      chartYAxisLabel: 'Conversion %',
      chartXAxisLabel: 'Source',
      chartData: [
        { label: 'Web', value: 22 },
        { label: 'Partner', value: 19 },
        { label: 'Trade Show', value: 14 },
        { label: 'Email', value: 11 },
        { label: 'Cold Call', value: 6 },
      ],
    },
  },
  {
    id: 'q3',
    text: 'Show me the total sales amount and opportunity type for closed won deals',
    source: 'Manual',
    thumbsUp: 22,
    thumbsDown: 2,
    semanticModel: 'C360',
    lastModified: 'Feb 02, 2024',
    classification: 'new',
    suggestedCorrection:
      "The query used Opportunity.Amount, but Sales_Extended.Net_Revenue is the expected measure for closed-won totals.",
    response: {
      summary:
        'Here are the closed-won opportunities by type, sorted by total sales amount.',
      followUp:
        'New Business contributed the largest share. Want a breakdown by region or by account owner?',
      sql: salesAmountSql,
      chartYAxisLabel: 'Sales Amount ($M)',
      chartXAxisLabel: 'Type',
      chartData: [
        { label: 'New Biz', value: 48 },
        { label: 'Renewal', value: 36 },
        { label: 'Upsell', value: 27 },
        { label: 'Cross-sell', value: 18 },
        { label: 'Other', value: 5 },
      ],
    },
  },
  {
    id: 'q4',
    text: 'How does the average deal size of opportunities for new business compare to existing?',
    source: 'AI Generated',
    thumbsUp: 7,
    thumbsDown: 18,
    semanticModel: 'C360',
    lastModified: 'Feb 01, 2024',
    classification: 'new',
    suggestedCorrection:
      "The agent used 'Total Orders' field but the expected query references 'Pipeline Value' instead.",
    response: {
      summary:
        'New-business deals are about 31% smaller on average than existing-customer deals.',
      followUp:
        'Existing-customer deals carry expansion ARR, which inflates the average. Want me to recompute excluding expansion line items?',
      sql: dealSizeSql,
      chartYAxisLabel: 'Avg Deal Size ($K)',
      chartXAxisLabel: 'Segment',
      chartData: [
        { label: 'New Business', value: 32 },
        { label: 'Existing', value: 46 },
      ],
    },
  },
  ...(generateGoldenQuestions()),
];

function generateGoldenQuestions(): Question[] {
  const texts = [
    'What is the average NPS score of all customers that have critical tickets and open pipeline?',
    'What is our average days to close?',
    'Show me the total sales amount and opportunity type for closed won deals last quarter',
    'Compare the average deal size for each lead source',
    "What's the total opportunity amount by opportunity stage for this quarter",
    'Total opportunity amount between aug 1 2024 and dec 1 2024, by closed date and region',
    'Whats the Average Deal Size this Quarter?',
    'List unconverted leads grouped by rating level and acquisition channel',
    'Compare lead conversion rate in the prior month for different sources, when responding exclude partner leads',
    "What's the total opportunity amount by opportunity stage for this quarter filtered by West region",
    'Which lead sources are generating the highest number of converted leads this quarter?',
    'Show pipeline velocity by sales rep for Q3',
    'What is the win rate by account segment?',
    'Show me monthly recurring revenue trend for the last 6 months',
    'Break down customer churn rate by industry vertical',
    'What is the average contract value for enterprise vs mid-market?',
    'Show forecast accuracy by quarter for the sales team',
    'What are the top 5 products by revenue contribution?',
    'Compare customer lifetime value across acquisition channels',
    'Show me the support ticket resolution time by priority level',
  ];
  const sources: Source[] = ['Manual', 'Feedback', 'AI Generated', 'Manual'];
  const models = ['C360', 'Sales', 'Marketing', 'Support'];
  const dates = [
    'Jan 28, 2024', 'Jan 27, 2024', 'Jan 25, 2024', 'Jan 24, 2024',
    'Jan 23, 2024', 'Jan 22, 2024', 'Jan 11, 2024', 'Jan 10, 2024',
    'Jan 09, 2024', 'Jan 08, 2024', 'Jan 07, 2024', 'Jan 06, 2024',
    'Jan 05, 2024', 'Jan 04, 2024', 'Jan 03, 2024', 'Jan 02, 2024',
    'Dec 28, 2023', 'Dec 27, 2023', 'Dec 22, 2023', 'Dec 20, 2023',
  ];

  return texts.map((text, i): Question => ({
    id: `g${i + 1}`,
    text,
    source: sources[i % sources.length],
    thumbsUp: 5 + Math.floor(i * 1.7),
    thumbsDown: i % 5 === 0 ? 1 : 0,
    semanticModel: models[i % models.length],
    lastModified: dates[i],
    classification: 'accurate',
    response: {
      summary: `Here is the result for: ${text}`,
      followUp: 'Would you like to drill down further or change the visualization?',
      sql: ordersSql,
      chartYAxisLabel: 'Value',
      chartXAxisLabel: 'Category',
      chartData: [
        { label: 'A', value: 30 + i * 3 },
        { label: 'B', value: 25 + i * 2 },
        { label: 'C', value: 18 + i },
      ],
    },
  }));
}
