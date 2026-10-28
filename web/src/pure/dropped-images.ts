/** Image files from a drop; everything else is ignored. */
export const droppedImages = (data: DataTransfer): File[] => Array.from(data.files).filter((f: File): boolean => f.type.startsWith('image/'));
