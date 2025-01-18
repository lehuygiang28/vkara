'use server';

import youtube from 'youtube-sr';
import { VideoCompact, Client as YoutubeiClient, SearchType } from 'youtubei';
import { YouTubeVideo } from '@/types/youtube.type';
import { formatSeconds, resolveUrl } from '@/lib/utils';

const youtubei = new YoutubeiClient();

const mapYoutubeiVideo = ({
    video,
    searchType,
}: {
    video: VideoCompact;
    searchType: SearchType;
}): YouTubeVideo => ({
    id: video.id,
    duration: video.duration || 0,
    duration_formatted: formatSeconds(video.duration || 0),
    thumbnail: {
        url: video.thumbnails[0].url,
    },
    title: video.title,
    type: searchType,
    url: '',
    uploadedAt: video.uploadDate || '',
    views: video.viewCount || 0,
    channel: {
        name: video.channel?.name || 'N/A',
        verified: false,
    },
});

// Function to get initial search results
export async function searchYouTube(
    query: string,
    isKaraoke: boolean,
): Promise<{
    items: YouTubeVideo[];
}> {
    const SEARCH_TYPE = 'video';
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        const youtubeSearchResults = await youtubei.search(searchQuery, {
            type: SEARCH_TYPE,
            sortBy: 'relevance',
        });
        await youtubeSearchResults.next();

        if (!youtubeSearchResults) {
            return { items: [] };
        }

        return {
            items: youtubeSearchResults.items.map((video) =>
                mapYoutubeiVideo({ video, searchType: SEARCH_TYPE }),
            ),
            // next: youtubeSearchResults.next,
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [] };
    }
}

// Function to check embeddable status for a batch of videos
export async function checkEmbeddableStatus(
    videoIds: string[],
): Promise<{ videoId: string; canEmbed: boolean }[]> {
    try {
        const response = await fetch(
            `${resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')}/check-embed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoIds }),
            },
        );

        return await response.json();
    } catch (error) {
        console.error('Error checking embeddable status:', error);
        return videoIds.map((id) => ({ videoId: id, canEmbed: false }));
    }
}

export async function getYoutubeSuggestions(query: string): Promise<string[]> {
    try {
        const getSuggestions = await youtube.getSuggestions(query);
        return getSuggestions;
    } catch {
        return [];
    }
}
