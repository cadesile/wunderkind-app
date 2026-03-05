import { apiRequest } from '@/api/client';
import { GameEventTemplate } from '@/types/narrative';

interface EventTemplatesResponse {
  templates: GameEventTemplate[];
}

export const eventsApi = {
  async fetchTemplates(): Promise<GameEventTemplate[]> {
    const data = await apiRequest<EventTemplatesResponse>('/api/events/templates');
    return data.templates;
  },
};
