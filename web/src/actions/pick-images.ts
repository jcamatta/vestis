import type { PickerFileHandle, ShowOpenFilePicker } from '../data/file-picker';

/** Opens the system file dialog for images. Empty when cancelled. */
export const pickImages = async (): Promise<File[]> => {
  const picker = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker }).showOpenFilePicker;
  if (!picker) throw new Error('This browser has no file picker; drop the photo on the page instead.');
  try {
    const handles = await picker.call(window, {
      multiple: true,
      excludeAcceptAllOption: true,
      types: [{ description: 'Images', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif'] } }],
    });
    return await Promise.all(handles.map((h: PickerFileHandle): Promise<File> => h.getFile()));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    throw error;
  }
};
