import { PhotoListId } from "./AlbumPhoto";
import { getAllPhotos } from "./AllPhotosSource";
import { createCollectionPhotoList, createHiddenCollection, getQuickCollectionList } from "./CollectionStore";
import { StaticPhotoSource, getFolderList } from "./FolderStore";
import { PhotoList } from "./PhotoList";

/**
 * it is easier for us to keep lists and invalidate them as we go
 */
export function loadPhotoList(id: PhotoListId): PhotoList {
  switch (id.kind) {
    case 'folder': return getFolderList(id);
    case 'all': return getAllPhotos();
    case 'quick': return getQuickCollectionList();
    case 'import': return getQuickCollectionList();
    case 'export': return createCollectionPhotoList(id);
    case 'hidden': return createHiddenCollection(id);
    default:
      return new PhotoList(id, new StaticPhotoSource([]));
  }
}
