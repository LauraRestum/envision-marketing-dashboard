// Skills loader: fetches skill files from the marketingskills GitHub repo
// at runtime and injects them into AI system prompts.
//
// Always pulls live from GitHub raw content so updates to the skills repo
// automatically reflect here with no code changes or redeployment needed.
//
// Falls back to hardcoded prompts if GitHub fetch fails.

const SKILLS_BASE = 'https://raw.githubusercontent.com/LauraRestum/marketingskills/main';

// Skill file mappings per API route
const SKILL_SETS = {
  format: [
    // Primary: social content strategy and platform-specific guidance
    'skills/social-content/SKILL.md',
    'skills/social-content/references/platforms.md',
    'skills/social-content/references/post-templates.md',
    // Supporting: copywriting foundations and editing quality
    'skills/copywriting/SKILL.md',
    'skills/copy-editing/SKILL.md',
    // Hooks and persuasion
    'skills/marketing-psychology/SKILL.md',
  ],
  ideas: [
    // Primary: ideation and content strategy
    'skills/marketing-ideas/SKILL.md',
    'skills/marketing-ideas/references/ideas-by-category.md',
    'skills/content-strategy/SKILL.md',
    // Supporting: social platform knowledge and psychology
    'skills/social-content/SKILL.md',
    'skills/social-content/references/platforms.md',
    'skills/marketing-psychology/SKILL.md',
  ],
};

// In-memory cache with 1-hour TTL to avoid hammering GitHub on every request
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

async function fetchSkillFile(path) {
  const cacheKey = path;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.content;
  }

  const url = `${SKILLS_BASE}/${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'text/plain' },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  const content = await res.text();
  cache.set(cacheKey, { content, time: Date.now() });
  return content;
}

/**
 * Load all skill files for a given route and combine them into
 * a single string block to inject into the system prompt.
 *
 * @param {'format' | 'ideas'} routeKey - Which API route is requesting skills
 * @returns {Promise<string|null>} Combined skill content, or null on failure
 */
export async function loadSkills(routeKey) {
  const paths = SKILL_SETS[routeKey];
  if (!paths) return null;

  try {
    const results = await Promise.allSettled(
      paths.map((path) => fetchSkillFile(path))
    );

    const loaded = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value) {
        const fileName = paths[i].split('/').pop();
        loaded.push(`--- ${fileName} ---\n${results[i].value}`);
      }
    }

    if (loaded.length === 0) return null;

    return `\n\n=== MARKETING SKILLS REFERENCE ===\nThe following are expert marketing skills and frameworks. Use them to inform your approach, but always prioritize any Envision-specific brand rules provided above.\n\n${loaded.join('\n\n')}`;
  } catch (err) {
    console.warn('Skills loader error:', err.message);
    return null;
  }
}
