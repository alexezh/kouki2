import { nowAsISOString } from "../lib/date";
import {
  PhotoListKind, WireCollection,
  WireCollectionMetadata,
  WireFolderMetadata,
  wireAddCollection,
  wireGetCollections
} from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoListId } from "./AlbumPhoto";
import { createQuickCollection, createQuickCollectionList } from "./LoadPhotoList";
import { PhotoCollection } from "./PhotoCollection";
import { libraryChanged } from "./PhotoStore";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export const collectionMap = new Map<CollectionId, PhotoCollection>();
export const collectionMapChanged = new SimpleEventSource<void>();
let libraryHandlerRegistered = false;
let hiddenColl: PhotoCollection | null = null;
let favoriteColl: PhotoCollection | null = null;
let rejectedColl: PhotoCollection | null = null;

export function addOnCollectionsChanged(func: () => void): number {
  return collectionMapChanged.add(func);
}

export function removeOnCollectionsChanged(id: number) {
  return collectionMapChanged.remove(id);
}

export function triggerRefreshCollections() {
  setTimeout(async () => {
    await loadCollections();
  });
}

function findCollection(pred: (coll: PhotoCollection) => boolean): PhotoCollection | null {
  for (let [_, coll] of collectionMap) {
    if (pred(coll)) {
      return coll;
    }
  }
  return null;
}

function findMostRecentCollection(kind: PhotoListKind): PhotoCollection | null {
  let coll: PhotoCollection | null = null;
  for (let [key, item] of collectionMap) {
    if (item.wire.kind === kind) {
      if (coll) {
        if (item.createDt.valueOf() > coll.createDt.valueOf()) {
          coll = item;
        }
      } else {
        coll = item;
      }
    }
  }

  return coll;
}

export function getCollectionById(id: CollectionId): PhotoCollection | null {
  let coll = collectionMap.get(id);
  if (!coll) {
    return null;
  }
  return coll;
}

/**
 * load map of collections
 */
export async function loadCollections(): Promise<boolean> {
  let wireCollections = await wireGetCollections();

  for (let wc of wireCollections) {
    let coll = collectionMap.get(wc.id as CollectionId);
    if (!coll) {
      coll = new PhotoCollection(wc);
      collectionMap.set(wc.id as CollectionId, coll);

      if (coll.id.kind === 'hidden') {
        hiddenColl = coll;
      } else if (coll.id.kind === 'favorite') {
        favoriteColl = coll;
      } else if (coll.id.kind === 'rejected') {
        rejectedColl = coll;
      }
    } else {
      // we only allow updating parts of wire
      coll.update(wc);
    }
  }

  // if we do not have quick collection, create it
  // we will create import export if needed
  let quickColl = findMostRecentCollection('quick');
  if (!quickColl) {
    createQuickCollection();
  }
  else {
    // create a list
    createQuickCollectionList(quickColl.id);
  }

  collectionMapChanged.invoke();

  if (!libraryHandlerRegistered) {
    libraryHandlerRegistered = true;
    libraryChanged.add({ invoke: onLibraryChanged });
  }

  return true;
}

function onLibraryChanged(records: LibraryUpdateRecord[]) {
  let hiddenDelta = 0, favoriteDelta = 0, rejectedDelta = 0;

  for (let x of records) {
    if (x.kind === LibraryUpdateRecordKind.update) {
      if (x.hidden !== undefined) {
        hiddenDelta += (x.hidden) ? 1 : -1;
      }
      else if (x.favorite !== undefined) {
        if (x.favorite > 0) {
          if (x.photo.favorite < 0) {
            hiddenDelta--;
          }
          favoriteDelta++;
        }
        if (x.favorite < 0) {
          if (x.photo.favorite > 0) {
            favoriteDelta--;
          }
          rejectedDelta++;
        }
      }
    }
  }


  if (hiddenDelta !== 0) {
    hiddenColl!.updateCount(hiddenDelta);
  }

  if (rejectedDelta !== 0) {
    rejectedColl!.updateCount(rejectedDelta);
  }

  if (favoriteDelta !== 0) {
    favoriteColl!.updateCount(favoriteDelta);
  }
}

export function getCollectionByKind(kind: PhotoListKind, maxItems?: number): PhotoCollection {
  for (let [key, coll] of collectionMap) {
    if (coll.id.kind === kind) {
      return coll;
    }
  }

  throw new Error("Collection not found");
}

export function getCollectionsByKind(kind: PhotoListKind, maxItems?: number): PhotoCollection[] {
  let list: PhotoCollection[] = [];
  for (let [key, coll] of collectionMap) {
    if (coll.id.kind === kind) {
      list.push(coll);
    }
  }
  list.sort((a: PhotoCollection, b: PhotoCollection) => b.createDt.valueOf() - a.createDt.valueOf());
  if (maxItems) {
    list = list.slice(0, maxItems);
  }

  return list;
}

/**
 * return default collection of specific kind
 * default collection is collection with newest time
 */
export async function createCollectionOfKind(kind: PhotoListKind): Promise<PhotoCollection> {
  // let coll: PhotoCollection | null = null;
  // for (let [key, item] of collectionMap) {
  //   if (item.wire.kind === kind) {
  //     if (coll) {
  //       if (coll.createDt.valueOf() > item.createDt.valueOf()) {
  //         coll = item;
  //       }
  //     } else {
  //       coll = item;
  //     }
  //   }
  // }

  // if (!coll) {
  let response = await wireAddCollection({ kind: kind, name: '', createDt: nowAsISOString() });
  let coll = new PhotoCollection(response.collection);
  collectionMap.set(response.collection.id as CollectionId, coll);
  // }

  return coll;
}

