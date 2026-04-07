// /api/format.js — Vercel API Route
// Social Formatter: calls Anthropic Claude API to reformat content
// for multiple social platforms.
//
// Loads marketing skills from the external skills repo at runtime
// to enhance the system prompt with expert copywriting and platform knowledge.

import { loadSkills } from './_skills.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured.' });
  }

  const { content, context, platforms } = req.body || {};

  if (!content || !platforms || platforms.length === 0) {
    return res.status(400).json({ error: 'Content and at least one platform are required.' });
  }

  const platformInstructions = {
    facebook: 'Facebook: Conversational, 1-3 short paragraphs, CTA in final line, up to 400 words.',
    instagram: 'Instagram: Hook as first line, punchy middle, 3-5 relevant hashtags at end, emoji optional but restrained, 150-220 words.',
    tiktok: 'TikTok: Very short, casual, voice of a person not a brand, conversational opener, 80-120 words, no hashtag stuffing.',
    linkedin: 'LinkedIn: Professional, lead with insight or outcome, 2-4 paragraphs, 1 soft CTA, 200-300 words.',
  };

  const platformPrompts = platforms.map((p) => platformInstructions[p] || '').filter(Boolean).join('\n');

  // Envision-specific brand rules (always present as the top layer)
  const envisionRules = `You are a social media copywriter for Envision Inc., a nonprofit social enterprise that leads with business credibility and mission impact. Write in a direct, modern, confident voice. Business first, mission second. No DEI buzzwords. No em dashes. No AI-sounding phrasing. No sight-based idioms (avoid "see", "look", "vision" in a metaphorical sense, use "understand", "experience", "feel" instead). Person-first language always. Sentence case on all copy. No exclamation points unless the user's source material contains them.

Format rules per platform:
${platformPrompts}

Return your response as a JSON object with platform keys and string values. Example:
{"facebook": "post copy here", "instagram": "post copy here"}

Only include the platforms requested. Return valid JSON only, no markdown code blocks.`;

  // Load external marketing skills (fallback: use Envision rules alone)
  const skillsContent = await loadSkills('format');
  const systemPrompt = skillsContent
    ? `${envisionRules}${skillsContent}`
    : envisionRules;

  const userMessage = context
    ? `Content to reformat:\n${content}\n\nAdditional context: ${context}`
    : `Content to reformat:\n${content}`;

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
      return res.status(200).json({ results: {}, raw: text, parseError: true });
    }

    return res.status(200).json({ results: parsed });
  } catch (err) {
    console.error('Format API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate content.' });
  }
}
