import mongoose from 'mongoose';
import type { Room, YouTubeVideo } from '@/types';

/**
 * These schemas currently not strict and may be not fully correct.
 * They are just for the purpose of demonstration.
 */

// Define a reusable sub-schema for video objects
const videoSchema = new mongoose.Schema<YouTubeVideo>({
    id: { type: String, required: true },
    url: { type: String, required: false, default: null },
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    duration_formatted: { type: String },
    uploadedAt: { type: String },
    thumbnail: {
        url: { type: String, required: true },
    },
    channel: {
        name: { type: String, required: true },
        verified: { type: Boolean, required: false, default: false },
    },
    views: { type: Number, required: false, default: 0 },
    type: { type: String, required: false, default: 'video' },
});

// Define the room schema
const roomSchema = new mongoose.Schema<Room>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        password: {
            type: String,
            required: false,
            default: null,
        },
        clients: [
            {
                type: String,
                index: true,
            },
        ],
        videoQueue: [videoSchema],
        historyQueue: [videoSchema],
        volume: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        playingNow: {
            type: videoSchema,
            default: null,
        },
        lastActivity: {
            type: Number,
            required: true,
        },
        creatorId: {
            type: String,
            required: true,
            index: true,
        },
        isPlaying: {
            type: Boolean,
            default: false,
        },
        currentTime: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        // Optimize read performance
        toJSON: {
            virtuals: true,
            getters: true,
        },
    },
);

// Index for cleanup jobs (by lastActivity)
roomSchema.index({ lastActivity: 1 });

// Compound index for query optimization
roomSchema.index({ id: 1, creatorId: 1 });

export const RoomModel = mongoose.model<Room>('Room', roomSchema);
