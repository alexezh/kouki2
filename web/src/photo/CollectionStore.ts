import { nowAsISOString } from "../lib/date";
import {
  PhotoListKind, WireCollection, WireCollectionItem,
  wireAddCollection, wireAddCollectionItems,
  wireGetCollectionItems, wireGetCollections
} from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoId, PhotoListId } from "./AlbumPhoto";
import { PhotoList, PhotoListChangeType } from "./PhotoList";
import { getPhotoById, queueOnLoaded } from "./PhotoStore";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly updateDt: Date;

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.updateDt = new Date(Date.parse(wire.name));
  }

  public get id(): CollectionId { return this.wire.id as CollectionId }
  public get kind(): PhotoListKind { return this.wire.kind }
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

  for (let wc of wireCollections) {
    let coll = collectionMap.get(wc.id as CollectionId);
    if (!coll) {
      coll = new PhotoCollection(wc);
      collectionMap.set(wc.id as CollectionId, coll);
    }
  }

  collectionChanged.invoke();

  return true;
}

export function getListsByKind(kind: PhotoListKind): PhotoListId[] {
  let list: PhotoListId[] = [];
  for (let [key, coll] of collectionMap) {
    if (coll.wire.kind === kind) {
      list.push(new PhotoListId(kind, coll.id));
    }
  }
  return list;
}

function findCollection(pred: (coll: PhotoCollection) => boolean): PhotoCollection | null {
  for (let [key, item] of collectionMap) {
    if (pred(item)) {
      return item;
    }
  }
  return null;
}

function findNewestCollection(kind: PhotoListKind): PhotoCollection | null {
  let coll: PhotoCollection | null = null;
  for (let [key, item] of collectionMap) {
    if (item.wire.kind === kind) {
      if (coll) {
        if (coll.updateDt.valueOf() > item.updateDt.valueOf()) {
          coll = item;
        }
      } else {
        coll = item;
      }
    }
  }
  return null;
}

/**
 * for import/export, we create collection on demand and we update collection daily
 */
export async function getStandardCollection(kind: PhotoListKind): Promise<PhotoList> {
  let coll: PhotoCollection | null = findNewestCollection(kind);

  let list: PhotoList | undefined;
  if (!coll) {
    let response = await wireAddCollection({ kind: kind, name: '', createDt: nowAsISOString() });
    coll = new PhotoCollection(response.collection);
    collectionMap.set(response.collection.id as CollectionId, coll);
  }

  let listId = new PhotoListId(kind, coll.wire.id);
  list = collectionLists.get(new PhotoListId(kind, listId.id).toString());
  if (list) {
    return list;
  }

  list = createCollectionPhotoList(listId);

  return list;
}

export function createCollectionPhotoList(listId: PhotoListId) {
  let list = new PhotoList(listId, async (self: PhotoList) => {
    return queueOnLoaded(async () => {

      let items: WireCollectionItem[] = await wireGetCollectionItems(listId.id);
      let photos: AlbumPhoto[] = [];

      for (let item of items) {
        let photo = getPhotoById(item.photoId as PhotoId);
        if (!photo) {
          console.error('Collection: cannot find photo ' + item.photoId);
          continue;
        }
        photos.push(photo);
      }

      self.addOnChanged((ct: PhotoListChangeType, items: AlbumPhoto[]) => {
        if (ct === PhotoListChangeType.load) {
          return;
        }

        wireAddCollectionItems(listId.id, items.map((x) => {
          return { photoId: x.wire.id, updateDt: nowAsISOString() }
        }));
      });

      return photos;
    });
  });

  return list;
}

/**
 * quick list is special as we need it at all time
 * the rest we can create on demand
 */
export function getQuickCollection(): PhotoList {
  let quickList = collectionLists.get('quick' as PhotoListKind);
  if (quickList) {
    return quickList;
  }

  let quickListId = new PhotoListId('quick', 0);
  quickList = new PhotoList(quickListId, async (self: PhotoList) => {
    return queueOnLoaded(async () => {

      // at this point we have collection list; find default quick and map to it
      // get the current quick and other collections
      let quickColl: PhotoCollection | null = findNewestCollection('quick');

      // ensure that we have quick collection
      if (!quickColl) {
        let response = await wireAddCollection({ kind: quickListId.kind, name: '', createDt: nowAsISOString() });
        quickColl = new PhotoCollection(response.collection);
        collectionMap.set(response.collection.id as CollectionId, quickColl);
      }

      let items: WireCollectionItem[] = await wireGetCollectionItems(quickColl.wire.id);
      let photos: AlbumPhoto[] = [];

      for (let item of items) {
        let photo = getPhotoById(item.photoId as PhotoId);
        if (!photo) {
          console.error('Collection: cannot find photo ' + item.photoId);
          continue;
        }
        photos.push(photo);
      }

      self.addOnChanged((ct: PhotoListChangeType, items: AlbumPhoto[]) => {
        if (ct === PhotoListChangeType.load) {
          return;
        }

        wireAddCollectionItems(quickColl!.wire.id, items.map((x) => {
          return { photoId: x.wire.id, updateDt: nowAsISOString() }
        }));
      });

      return photos;
    });
  });

  collectionLists.set('quick', quickList);

  return quickList;
}
