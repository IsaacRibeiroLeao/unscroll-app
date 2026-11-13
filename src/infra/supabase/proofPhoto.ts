import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.7;

/** Downscales and re-encodes as JPEG (the bucket accepts image/jpeg up to 2 MB). Returns bytes. */
export async function preparePhotoBytes(uri: string): Promise<ArrayBuffer> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: MAX_WIDTH }).renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return new File(saved.uri).arrayBuffer();
}

/** The photo must not linger on the device after verification (LGPD / privacy). Best effort. */
export function discardPhoto(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // already gone or not deletable: nothing else to do
  }
}
