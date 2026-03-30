import { useAuthStore } from '@/stores/authStore';
import Constants from 'expo-constants';
import { PlayerArchetype } from '@/types/archetype';

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080`;
  }

  return 'https://api.buildmyclub.co.uk';
}

const BASE_URL = resolveBaseUrl();

interface ArchetypesResponse {
  archetypes: PlayerArchetype[];
  versionHash: string;
}

async function getArchetypesResponse(): Promise<ArchetypesResponse | null> {
  try {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${BASE_URL}/api/archetypes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    return await res.json() as ArchetypesResponse;
  } catch {
    return null;
  }
}

/**
 * Check the server's current archetype version hash.
 * Returns the hash string, or null if the request fails.
 */
export async function fetchArchetypeVersionHash(): Promise<string | null> {
  const data = await getArchetypesResponse();
  return data?.versionHash ?? null;
}

/**
 * Fetch the full archetype list from the server.
 * Returns null if the request fails.
 */
export async function fetchArchetypes(): Promise<PlayerArchetype[] | null> {
  const data = await getArchetypesResponse();
  return data?.archetypes ?? null;
}
