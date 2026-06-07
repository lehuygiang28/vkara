import { z } from 'zod';

export const tiktokSearchBodySchema = z
    .object({
        query: z.string().trim().min(1).max(200),
        cursor: z.coerce.number().int().min(0).optional(),
        searchId: z.string().trim().min(1).max(128).optional(),
    })
    .superRefine((value, ctx) => {
        const cursor = value.cursor ?? 0;
        if (cursor > 0 && !value.searchId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'searchId is required when cursor > 0',
                path: ['searchId'],
            });
        }
    });

export type TiktokSearchBody = z.infer<typeof tiktokSearchBodySchema>;
