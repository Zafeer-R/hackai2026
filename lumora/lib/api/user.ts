import type { UserProfile, SkillEntry } from '@/lib/types/user';

export async function loadUserProfile(): Promise<UserProfile> {
  const res = await fetch('/user.md');
  const text = await res.text();
  return parseUserMd(text);
}

function parseUserMd(md: string): UserProfile {
  const lines = md.split('\n');

  // Name from first heading
  const nameLine = lines.find(l => l.startsWith('# '));
  const name = nameLine ? nameLine.replace('# ', '').trim() : 'User';

  // Sections
  const sections: Record<string, string[]> = {};
  let currentSection = '';
  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim().toLowerCase();
      sections[currentSection] = [];
    } else if (currentSection && line.trim()) {
      sections[currentSection].push(line.trim());
    }
  }

  // Background
  const background = (sections['background'] || []).join(' ');

  // Skills
  const skills: SkillEntry[] = (sections['skills'] || [])
    .filter(l => l.startsWith('- '))
    .map(l => {
      const parts = l.replace('- ', '').split('|').map(s => s.trim());
      return {
        skill: parts[0] || '',
        level: (parts[1] || 'beginner') as SkillEntry['level'],
        confidence: parseFloat(parts[2]) || 0,
      };
    });

  // Interests
  const interests = (sections['interests'] || [])
    .filter(l => l.startsWith('- '))
    .map(l => l.replace('- ', '').trim());

  // Links
  let linkedin: string | undefined;
  let github: string | undefined;
  for (const l of sections['links'] || []) {
    if (l.startsWith('- linkedin:')) linkedin = l.replace('- linkedin:', '').trim();
    if (l.startsWith('- github:')) github = l.replace('- github:', '').trim();
  }

  return { name, background, skills, interests, linkedin, github };
}
