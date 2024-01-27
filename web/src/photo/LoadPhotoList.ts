import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { createCollectionPhotoList, getQuickCollection, getStandardCollection, loadCollections } from "./CollectionStore";
import { getFolderList } from "./FolderStore";
import { PhotoList } from "./PhotoList";
import { filterPhotos, getAllPhotos } from "./PhotoStore";

/**
 * it is easier for us to keep lists and invalidate them as we go
 */
export function loadPhotoList(id: PhotoListId): PhotoList {
  if (id.kind === 'folder') {
    return getFolderList(id);
  } else if (id.kind === 'all') {
    return getAllPhotos();
  } else if (id.kind === 'quick') {
    return getQuickCollection();
  } else if (id.kind === 'import') {
    return getQuickCollection();
  } else if (id.kind === 'export') {
    return createCollectionPhotoList(id);
  } else {
    return new PhotoList(id, () => Promise.resolve([]));
  }
}
