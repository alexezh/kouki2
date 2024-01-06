import { PhotoListKind, WireCollection, WireCollectionItem, WireFolder, wireAddCollection, wireGetCollectionItems, wireGetCollections, wireGetFolders } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { PhotoList } from "./PhotoList";
import { getPhotoById, queueOnLoaded } from "./PhotoStore";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly updateDt: Date;
  public isDefault: boolean = false;

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.updateDt = new Date(Date.parse(wire.name));
  }
}

let collectionMap = new Map<CollectionId, PhotoCollection>();
let collectionChanged = new SimpleEventSource();

// ATT: we are using stable names for quick and some other collections
// making them "virtual". When we save quick collection, we are going to
// keep ID and replace content
let collectionLists = new Map<string, PhotoList>();

export function addOnCollectionsChanged(func: () => void): number {
  return collectionChanged.add(func);
}

export function removeOnCollectionsChanged(id: number) {
  return collectionChanged.remove(id);
}

export function triggerRefreshCollections() {
  setTimeout(async () => {
    await loadCollections();
  });
}

// export function getCollection(id: CollectionId): PhotoList | undefined {
//   return collectionLists.get(id);
// }

// export function getCollections(): IterableIterator<PhotoCollection> {
//   return collectionMap;
// }

export async function loadCollections(): Promise<boolean> {
  let wireCollections = await wireGetCollections();

  let catalogMap = new Map<PhotoListKind, PhotoCollection>();
  for (let wc of wireCollections) {
    let coll = collectionMap.get(wc.id as CollectionId);
    if (!coll) {
      coll = new PhotoCollection(wc);
      collectionMap.set(wc.id as CollectionId, coll);
    }

    // get the current quick and other collections
    let cat = catalogMap.get(coll.wire.kind as PhotoListKind);
    if (!cat) {
      catalogMap.set(coll.wire.kind as PhotoListKind, coll);
    } else {
      if (coll.updateDt.valueOf() > cat.updateDt.valueOf()) {
        catalogMap.set(coll.wire.kind as PhotoListKind, coll)
      }
    }
  }

  for (let [key, coll] of catalogMap) {
    coll.isDefault = true;
  }

  collectionChanged.invoke();

  return true;
}

export function getQuickCollection(): PhotoList {
  let quickList = collectionLists.get('quick' as PhotoListKind);
  if (quickList) {
    return quickList;
  }

  quickList = new PhotoList(new PhotoListId('quick', 0), async () => {
    return queueOnLoaded(async () => {

      let quickColl: PhotoCollection | null = null;

      // at this point we have collection list; find default quick and map to it
      for (let [key, coll] of collectionMap) {
        if (coll.isDefault && coll.wire.kind === 'quick') {
          quickColl = coll;
          break;
        }
      }

      // ensure that we have quick collection
      if (!quickColl) {
        let response = await wireAddCollection({ kind: 'quick', name: '', createDt: Date.now().toString() });
        quickColl = new PhotoCollection(response.collection);
        collectionMap.set(response.collection.id as CollectionId, quickColl);
      }

      let items: WireCollectionItem[] = await wireGetCollectionItems(quickColl.wire.id);
      let photos: AlbumPhoto[] = [];

      for (let item of items) {
        let photo = getPhotoById(item.photoId);
        if (!photo) {
          console.error('Collection: cannot find photo ' + item.photoId);
          continue;
        }
        photos.push(photo);
      }

      return photos;
    });
  });

  collectionLists.set('quick', quickList);
  return quickList;
}

export function addQuickCollection(photos: AlbumPhoto[] | (() => IterableIterator<AlbumPhoto>)) {

  getQuickCollection().addPhotos(photos);
}