import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { getQuickCollection, loadCollections } from "./CollectionStore";
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
  } else {
    return new PhotoList(id, () => Promise.resolve([]));
  }
}

export async function getPhotoListSize(id: PhotoListId): Promise<number> {
  let list = await loadPhotoList(id);
  return list.photos.length;
}
