import { nowAsISOString } from "../lib/date";
import { wireAddCollection } from "../lib/photoclient";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { getAllPhotos } from "./AllPhotosSource";
import { CollectionPhotoSource } from "./CollectionPhotoSource";
import { CollectionId, collectionMap, collectionMapChanged } from "./CollectionStore";
import { StaticPhotoSource, getFolderList } from "./FolderStore";
import { PhotoCollection } from "./PhotoCollection";
import { FilteredPhotoSource, HiddenPhotoSource } from "./HiddenPhotoSource";
import { PhotoList } from "./PhotoList";

export function createCollectionPhotoList(listId: PhotoListId) {
  let list = new PhotoList(listId, new CollectionPhotoSource(listId.id as CollectionId));

  return list;
}

let quickList: PhotoList | null = null;
export function createQuickCollectionList(listId: PhotoListId): PhotoList {
  quickList = new PhotoList(listId, new CollectionPhotoSource(listId.id as CollectionId));
  return quickList;
}

export async function createQuickCollection() {
  let response = await wireAddCollection({ kind: 'quick', name: '', createDt: nowAsISOString() });
  let quickColl = new PhotoCollection(response.collection);
  collectionMap.set(response.collection.id as CollectionId, quickColl);
  createQuickCollectionList(quickColl.id);

  collectionMapChanged.invoke();

  console.log('loadCollections: create quick collection ' + quickColl.id.id);
}

export function getQuickCollectionList(): PhotoList {
  if (!quickList) {
    throw new Error('Not initialized');
  }
  return quickList;
}

export function createHiddenCollectionList(listId: PhotoListId): PhotoList {
  let list = new PhotoList(listId, new HiddenPhotoSource());
  return list;
}

/**
 * it is easier for us to keep lists and invalidate them as we go
 */
export function loadPhotoList(id: PhotoListId): PhotoList {
  switch (id.kind) {
    case 'folder': return getFolderList(id);
    case 'all': return getAllPhotos();
    case 'quick': {
      let quickList = getQuickCollectionList();

      if (id.isEqual(quickList.id)) {
        return quickList;
      }

      return createCollectionPhotoList(id);
    }
    case 'import': return createCollectionPhotoList(id);
    case 'export': return createCollectionPhotoList(id);
    case 'hidden': return createHiddenCollectionList(id);
    case 'favorite': return new PhotoList(id, new FilteredPhotoSource((x: AlbumPhoto) => x.reactions.isFavorite));
    case 'rejected': return new PhotoList(id, new FilteredPhotoSource((x: AlbumPhoto) => x.reactions.isRejected));
    default:
      return new PhotoList(id, new StaticPhotoSource([]));
  }
}
