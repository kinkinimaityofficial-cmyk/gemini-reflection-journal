import { ReflectionModeConfig } from '../types';

export const REFLECTION_MODES: ReflectionModeConfig[] = [
  {
    id: 'reflect',
    label: 'Reflect & Inquire',
    description: 'Deep thoughtful perspectives with gentle guiding questions.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    placeholder: 'What happened today, what feelings arose, or what situation is on your mind?',
    starterPrompts: [
      'Something that energized or drained my energy today...',
      'A conversation that left an impression on me...',
      'What I am learning about my current boundaries...',
      'An unexpected moment of clarity I experienced this week...',
    ],
  },
  {
    id: 'summarize',
    label: 'Summarize & Themes',
    description: 'Distill core themes, emotional pulse, and key patterns.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    placeholder: 'Dump your raw thoughts, brain-dumps, or meeting/day takeaways to distill...',
    starterPrompts: [
      'Here is a quick brain dump of everything happening right now...',
      'A recap of major milestones and blockers from this week...',
      'Synthesizing what I feel about an upcoming transition...',
    ],
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm & Expand',
    description: 'Explore creative angles, alternative viewpoints, and ideas.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    placeholder: 'Share an idea, challenge, or project you want to explore from fresh angles...',
    starterPrompts: [
      'I want to brainstorm creative ways to tackle...',
      'New habits or creative rituals I would love to experiment with...',
      'How might I reframe this current roadblock into an opportunity?',
    ],
  },
  {
    id: 'action',
    label: 'Actionable Steps',
    description: 'Turn your reflections into realistic, tangible next steps.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    placeholder: 'Describe a goal, decision, or intention you want to break down into action items...',
    starterPrompts: [
      'I want to break this personal goal down into small, daily micro-actions...',
      'Next steps to prepare for a critical conversation or project launch...',
      'Creating a balanced, realistic weekly rhythm for my priority goals...',
    ],
  },
];
