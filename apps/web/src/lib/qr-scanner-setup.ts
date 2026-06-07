import QrScanner from 'qr-scanner';

/** Large central region — easier to capture TV QR codes from a distance. */
export function calculateTvFriendlyScanRegion(video: HTMLVideoElement): QrScanner.ScanRegion {
    const width = video.videoWidth;
    const height = video.videoHeight;
    const size = Math.floor(Math.min(width, height) * 0.92);

    return {
        x: Math.floor((width - size) / 2),
        y: Math.floor((height - size) / 2),
        width: size,
        height: size,
        downScaledWidth: Math.min(size, 400),
        downScaledHeight: Math.min(size, 400),
    };
}

export function createQrScanner(
    video: HTMLVideoElement,
    onDecode: (data: string) => void,
): QrScanner {
    const scanner = new QrScanner(video, (result) => onDecode(result.data), {
        preferredCamera: 'environment',
        maxScansPerSecond: 30,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        calculateScanRegion: calculateTvFriendlyScanRegion,
    });

    // QR on TV/phone screens often needs inverted detection.
    scanner.setInversionMode('both');

    return scanner;
}
