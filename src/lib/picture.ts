// Picture questions: pick one picture and prepare a small, upright copy for the engine.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

// Same as the bridge's own limit, so nothing the model can see is lost (Q-05).
const MAX_EDGE = 1024;
// ponytail: fixed pixel ceiling so a huge file cannot use up memory while it is opened.
// Raise it if real photos from this phone are refused.
const MAX_PIXELS = 100_000_000;

/**
 * Let the user pick one picture with Android's own photo picker (no permission needed).
 * Returns the prepared copy's URI, or null if the user cancelled. Throws plain words on failure.
 */
export async function pickPicture(): Promise<string | null> {
  const result = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false });
  if (result.canceled) return null;
  const picked = result.assets[0];

  try {
    if (picked.width * picked.height > MAX_PIXELS) throw new TooLarge();
    // The image loader turns photos upright from their rotation tag while opening them, so the
    // long edge is measured on the opened picture, not on the picker's numbers.
    let image = await ImageManipulator.manipulate(picked.uri).renderAsync();
    if (Math.max(image.width, image.height) > MAX_EDGE) {
      const size = image.width >= image.height ? { width: MAX_EDGE } : { height: MAX_EDGE };
      image = await ImageManipulator.manipulate(image).resize(size).renderAsync();
    }
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    return saved.uri;
  } catch (e) {
    // Never log the path or the picture, only what kind of error it was.
    console.log(`[picture] prepare failed: ${e instanceof Error ? e.name : 'unknown'}`);
    if (e instanceof TooLarge) throw new Error('This picture is too large. Try a smaller one.');
    throw new Error('This picture could not be opened. Try another one.');
  } finally {
    deletePicture(picked.uri);
  }
}

/** Delete a picture copy. A file that is already gone is fine. */
export function deletePicture(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clean up.
  }
}

/** Delete every picture copy, for leftovers from an app that was closed or killed (R-31). */
export function clearPictureCache() {
  // Where the picker and the manipulator write their copies (checked on the phone).
  for (const name of ['ImagePicker', 'ImageManipulator']) {
    try {
      const dir = new Directory(Paths.cache, name);
      if (dir.exists) dir.delete();
    } catch {
      // Nothing to clean up.
    }
  }
}

class TooLarge extends Error {
  name = 'TooLarge';
}
