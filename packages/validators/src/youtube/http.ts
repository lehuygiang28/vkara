import { z } from 'zod';

export const youtubeSearchBodySchema = z.object({
    query: z.string(),
    continuation: z.string().optional(),
});

export const youtubeSearchSuggestionsBodySchema = z.object({
    query: z.string(),
});

export const youtubePlaylistDetailsBodySchema = z.object({
    playlistUrlOrId: z.string(),
    videoLimit: z.number().optional(),
    fetchAll: z.boolean().optional(),
});

export const youtubeRelatedBodySchema = z.object({
    videoId: z.string(),
    continuation: z.string().optional(),
});

export const youtubeCheckEmbeddableBodySchema = z.object({
    videoIds: z.array(z.string()),
});
