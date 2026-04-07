// /api/ideas.js — Vercel API Route
// AI Content Idea Generator: calls Anthropic Claude API to generate
// content ideas tagged by Envision pillar.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured.' });
  }

  const { platforms, theme, recentWins } = req.body || {};

  if (!platforms || platforms.length === 0) {
    return res.status(400).json({ error: 'At least one platform is required.' });
  }

  const systemPrompt = `You are a content strategist for Envision Inc., a nonprofit social enterprise in the blindness/visual impairment space. Envision leads with business credibility and mission impact. Their five pillars are: Research, Vision Rehabilitation, Employment, Education, and Arts & Culture.

Generate 7 content ideas for social media. Each idea should include:
- platform: which platform this is best for
- hook: the opening line or hook
- angle: the content angle or story approach
- format: suggested format (video, carousel, single image, text post, reel, story)
- pillar: which Envision pillar it speaks to (research, vision_rehab, employment, education, arts_culture)

Voice guidelines: Direct, modern, confident. No DEI buzzwords. No em dashes. No sight-based idioms. Person-first language.

Return your response as a JSON array of objects. Return valid JSON only, no markdown code blocks.`;

  let userMessage = `Generate content ideas for: ${platforms.join(', ')}`;
  if (theme) userMessage += `\nTheme or campaign focus: ${theme}`;
  if (recentWins) userMessage += `\nWhat has performed well recently: ${recentWins}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let parsed;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ ideas: [], raw: text, parseError: true });
    }

    return res.status(200).json({ ideas: Array.isArray(parsed) ? parsed : [] });
  } catch (err) {
    console.error('Ideas API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate ideas.' });
  }
}
