import { flags, endpoints, mockDelays } from '@/lib/config';
import type { Roadmap } from '@/lib/types/roadmap';
import type { DetectedStartingPoint, SuggestedGoal } from '@/lib/types/chat';
import mockRoadmap from '@/mocks/roadmap.json';

export async function generateRoadmap(
  startingPoint: DetectedStartingPoint,
  endGoal: SuggestedGoal
): Promise<Roadmap> {
  if (flags.useMocks) {
    await new Promise(r => setTimeout(r, mockDelays.roadmapGenerate));
    return mockRoadmap as Roadmap;
  }

  const res = await fetch(endpoints.roadmap.generate, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ starting_point: startingPoint, end_goal: endGoal }),
  });
  return res.json();
}

export async function adjustRoadmap(
  roadmapId: string,
  adjustment: string,
  context?: {
    startingPoint: DetectedStartingPoint;
    endGoal: SuggestedGoal;
    currentRoadmap: Roadmap;
  }
): Promise<Roadmap> {
  if (flags.useMocks) {
    await new Promise(r => setTimeout(r, mockDelays.roadmapAdjust));
    // In mock mode, return a slightly modified version to show something changed
    const adjusted = { ...mockRoadmap } as Roadmap;
    adjusted.roadmap_id = `${adjusted.roadmap_id}_adjusted`;
    return adjusted;
  }

  const res = await fetch(endpoints.roadmap.adjust, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roadmap_id: roadmapId,
      adjustment,
      starting_point: context?.startingPoint,
      end_goal: context?.endGoal,
      current_roadmap: context?.currentRoadmap,
    }),
  });
  return res.json();
}
