import { z } from 'zod';

export const youTubeThumbnailVariantSchema = z.object({
    url: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
});

export const youTubeVideoSchema = z.object({
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
    thumbnails: z.array(youTubeThumbnailVariantSchema),
    isLive: z.boolean().optional(),
});

export type YouTubeVideoInput = z.infer<typeof youTubeVideoSchema>;
