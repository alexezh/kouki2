import { nowAsISOString } from "../lib/date";
import {
  PhotoListKind, WireCollection, WireCollectionItem,
  wireAddCollection, wireAddCollectionItems,
  wireGetCollectionItems, wireGetCollections
} from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoId, PhotoListId } from "./AlbumPhoto";
import { HiddenPhotoSource } from "./HiddenPhotoSource";
import { IPhotoListSource, PhotoList } from "./PhotoList";
import { getPhotoById } from "./PhotoStore";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly createDt: Date;

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.createDt = new Date(Date.parse(wire.createDt));
  }

  public get id(): CollectionId { return this.wire.id as CollectionId }
  public get kind(): PhotoListKind { return this.wire.kind }

  public createListId(): PhotoListId {
    return new PhotoListId(this.kind, this.id);
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

export function getCollectionsByKind(kind: PhotoListKind): PhotoCollection[] {
  let list: PhotoCollection[] = [];
  for (let [key, coll] of collectionMap) {
    if (coll.kind === kind) {
      list.push(coll);
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
        if (coll.createDt.valueOf() > item.createDt.valueOf()) {
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

  let listId = new PhotoListId(kind, coll.wire.id as CollectionId);
  list = collectionLists.get(new PhotoListId(kind, listId.id).toString());
  if (list) {
    return list;
  }

  list = createCollectionPhotoList(listId);

  return list;
}

export function createCollectionPhotoList(listId: PhotoListId) {
  let list = new PhotoList(listId, new CollectionPhotoSource(listId.id as CollectionId));

  return list;
}

export function createHiddenCollection(listId: PhotoListId) {
  let list = new PhotoList(listId, new HiddenPhotoSource());
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

  let quickListId = new PhotoListId('quick', 0 as CollectionId);
  quickList = new PhotoList(quickListId, new QuickCollectionSource(quickListId.id as CollectionId));

  collectionLists.set('quick', quickList);

  return quickList;
}

export class CollectionPhotoSource implements IPhotoListSource {
  private photos: AlbumPhoto[] = [];
  private collId: CollectionId | undefined = undefined;

  public constructor(collId: CollectionId) {
    this.collId = collId;
    setTimeout(async () => {
      await this.loadPhotos();
    })
  }

  protected async getOrCreateCollection(): Promise<CollectionId> {
    if (!this.collId) {
      throw new Error('Unknown collection id');
    }
    return this.collId;
  }

  private async loadPhotos(): Promise<AlbumPhoto[]> {
    this.collId = await this.getOrCreateCollection();

    let items: WireCollectionItem[] = await wireGetCollectionItems(this.collId);
    let photos: AlbumPhoto[] = [];

    for (let item of items) {
      let photo = getPhotoById(item.photoId as PhotoId);
      if (!photo) {
        console.error('Collection: cannot find photo ' + item.photoId);
        continue;
      }
      photos.push(photo);
    }

    return photos;
  }

  public addItems(items: AlbumPhoto[]) {
    wireAddCollectionItems(this.collId!, items.map((x) => {
      return { photoId: x.wire.id, updateDt: nowAsISOString() }
    }));

  }

  public removeItems(items: AlbumPhoto[]) {
  }

  public setChangeHandler(func: () => void): void {
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    return this.photos;
  }
}

class QuickCollectionSource extends CollectionPhotoSource {
  public constructor(collId: CollectionId) {
    super(collId);
  }

  protected override async getOrCreateCollection(): Promise<CollectionId> {
    // at this point we have collection list; find default quick and map to it
    // get the current quick and other collections
    let quickColl: PhotoCollection | null = findNewestCollection('quick');

    // ensure that we have quick collection
    if (!quickColl) {
      let response = await wireAddCollection({ kind: 'quick', name: '', createDt: nowAsISOString() });
      quickColl = new PhotoCollection(response.collection);
      collectionMap.set(response.collection.id as CollectionId, quickColl);
    }

    return quickColl.id;
  }
}