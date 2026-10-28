// Chromium's File System Access API, not yet in the DOM lib types.
export type FilePickerOptions = {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
};

export type PickerFileHandle = { getFile: () => Promise<File> };

export type ShowOpenFilePicker = (options: FilePickerOptions) => Promise<PickerFileHandle[]>;
