import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { getQuickCollection, loadCollections } from "./CollectionStore";
import { getFolderList } from "./FolderStore";
import { PhotoList } from "./PhotoList";
import { filterPhotos, getAllPhotos, loadLibrary, photoLibraryMap, sortByDate } from "./PhotoStore";

/**
 * it is easier for us to keep lists and invalidate them as we go
 */
export async function loadPhotoList(id: PhotoListId): Promise<PhotoList> {
  await loadLibrary();

  if (id.kind === 'folder') {
    return getFolderList(id);
  } else if (id.kind === 'all') {
    return getAllPhotos();
  } else if (id.kind === 'quick') {
    await loadCollections();
    let coll = getQuickCollection();
    return coll;
  } else {
    return new PhotoList(id, []);
  }
}

export async function getPhotoListSize(id: PhotoListId): Promise<number> {
  let list = await loadPhotoList(id);
  return list.photos.length;
}
