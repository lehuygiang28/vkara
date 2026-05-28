import mongoose from 'mongoose';
import type { ClientInfo } from '@/types';

const clientSchema = new mongoose.Schema<ClientInfo>(
    {
        id: {
            type: String,
            required: true,
            index: true,
        },
        roomId: {
            type: String,
            index: true,
        },
        lastSeen: {
            type: Number,
            default: () => Date.now(),
        },
    },
    {
        timestamps: true,
    },
);

// Create compound index for faster queries
clientSchema.index({ id: 1, roomId: 1 });

export const ClientModel = mongoose.model<ClientInfo>('Client', clientSchema);
