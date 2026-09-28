import { inpaint } from './pixels';
self.onmessage = (event: MessageEvent<{
    width: number;
    height: number;
    pixels: ArrayBuffer;
    mask: ArrayBuffer;
}>) => {
    try {
        const { width, height, pixels, mask } = event.data;
        const image = { width, height, data: new Uint8ClampedArray(pixels) } as ImageData;
        const result = inpaint(image, new Uint8Array(mask));
        self.postMessage({ pixels: result.data.buffer }, { transfer: [result.data.buffer] });
    }
    catch (error) {
        self.postMessage({ error: (error as Error).message });
    }
};
