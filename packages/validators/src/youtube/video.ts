import { z } from 'zod';

export const youtubeThumbnailVariantSchema = z.object({
    url: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
});

export const youtubeVideoSchema = z.object({
    id: z.string(),
    duration: z.number(),
    duration_formatted: z.string(),
    title: z.string(),
    type: z.string(),
    uploadedAt: z.string(),
    url: z.string(),
    views: z.number(),
    channels: z
        .array(
            z.object({
                name: z.string(),
                verified: z.boolean(),
            }),
        )
        .min(1),
    thumbnails: z.array(youtubeThumbnailVariantSchema),
    isLive: z.boolean().optional(),
    source: z.enum(['youtube', 'tiktok']).optional(),
    tiktokImageCount: z.number().int().positive().optional(),
});

export type YouTubeVideoInput = z.infer<typeof youtubeVideoSchema>;
