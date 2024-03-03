import { nowAsISOString } from "../lib/date";
import {
  PhotoListKind, WireCollection,
  WireCollectionMetadata,
  WireFolderMetadata,
  wireAddCollection,
  wireGetCollections
} from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { PhotoListId } from "./AlbumPhoto";
import { createQuickCollection, createQuickCollectionList } from "./LoadPhotoList";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly createDt: Date;
  private _id: PhotoListId;
  private _metadata: WireCollectionMetadata;
  private readonly onChanged: SimpleEventSource<void> = new SimpleEventSource();

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.createDt = new Date(Date.parse(wire.createDt));
    this._id = new PhotoListId(this.wire.kind, this.wire.id as CollectionId)
    this._metadata = JSON.parse(this.wire.metadata);
  }

  public get id(): PhotoListId { return this._id }
  public get metadata(): WireCollectionMetadata { return this._metadata }
  public get totalPhotos(): number { return this._metadata?.totalPhotos ?? 0 }

  public update(wire: WireCollection): void {
    this.wire.metadata = wire.metadata;
  }
  public addOnChanged(func: () => void): number {
    return this.onChanged.add(func);
  }
  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }
}

export const collectionMap = new Map<CollectionId, PhotoCollection>();
export const collectionMapChanged = new SimpleEventSource<void>();

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

  return true;
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

