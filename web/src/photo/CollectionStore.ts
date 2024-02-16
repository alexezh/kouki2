import { nowAsISOString } from "../lib/date";
import {
  PhotoListKind, WireCollection, WireCollectionItem,
  wireAddCollection, wireAddCollectionItems,
  wireGetCollectionItems, wireGetCollections
} from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoId, PhotoListId } from "./AlbumPhoto";
import { HiddenPhotoSource } from "./HiddenPhotoSource";
import { AppFilter, IPhotoListSource, PhotoList } from "./PhotoList";
import { getPhotoById, waitLibraryLoaded } from "./PhotoStore";

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
let collectionMapChanged = new SimpleEventSource<void>();

// ATT: we are using stable names for quick and some other collections
// making them "virtual". When we save quick collection, we are going to
// keep ID and replace content
let collectionLists = new Map<string, PhotoList>();

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
    }
  }

  collectionMapChanged.invoke();

  return true;
}

export function getCollectionsByKind(kind: PhotoListKind): PhotoCollection[] {
  let list: PhotoCollection[] = [];
  for (let [key, coll] of collectionMap) {
    if (coll.kind === kind) {
      list.push(coll);
    }
  }
  list.sort((a: PhotoCollection, b: PhotoCollection) => a.createDt.valueOf() - b.createDt.valueOf());
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

export async function getStandardCollection(kind: PhotoListKind): Promise<PhotoCollection> {
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

  if (!coll) {
    let response = await wireAddCollection({ kind: kind, name: '', createDt: nowAsISOString() });
    coll = new PhotoCollection(response.collection);
    collectionMap.set(response.collection.id as CollectionId, coll);
  }

  return coll;
}

/**
 * for import/export/quick, we create collection on demand and we update collection daily
 */
export async function getStandardCollectionList(kind: PhotoListKind): Promise<PhotoList> {
  let coll: PhotoCollection | null = await getStandardCollection(kind);

  let listId = new PhotoListId(kind, coll.wire.id as CollectionId);
  let list = collectionLists.get(new PhotoListId(kind, listId.id).toString());
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
export function getQuickCollectionList(): PhotoList {
  let quickList = collectionLists.get('quick' as PhotoListKind);
  if (quickList) {
    return quickList;
  }

  let quickListId = new PhotoListId('quick', 0 as CollectionId);
  quickList = new PhotoList(quickListId, new QuickCollectionSource(quickListId.id as CollectionId));

  collectionLists.set('quick', quickList);

  return quickList;
}

/**
 * standard collections create bit of complexity
 * normally we know the exact ID for collection which means that it was loaded
 * but for standard collections, we just know the alias; and we might create it
 * before the load. 
 */
export class CollectionPhotoSource implements IPhotoListSource {
  private changeHandler: ((update: LibraryUpdateRecord[]) => void) | null = null;
  private photos: AlbumPhoto[] = [];
  private coll: PhotoCollection | undefined = undefined;

  public constructor(collId: CollectionId) {
    setTimeout(async () => {
      await this.loadPhotos(collId);
    })
  }

  public isHidden(photo: AlbumPhoto): boolean {
    return false;
  }

  public setAppFilter(filter: AppFilter): void {

  }

  protected async getOrCreateCollection(id: CollectionId): Promise<PhotoCollection> {
    await waitLibraryLoaded();
    let coll = collectionMap.get(id);
    if (!coll) {
      throw new Error('Collection not found');
    }
    return coll;
  }

  /**
   * load photos to collection
   */
  private async loadPhotos(collId: CollectionId): Promise<void> {
    this.coll = await this.getOrCreateCollection(collId);

    let items: WireCollectionItem[] = await wireGetCollectionItems(this.coll.id);
    let photos: AlbumPhoto[] = [];

    for (let item of items) {
      let photo = getPhotoById(item.photoId as PhotoId);
      if (!photo) {
        console.error('Collection: cannot find photo ' + item.photoId);
        continue;
      }
      photos.push(photo);
    }

    this.photos = photos;
    this.changeHandler?.call(this, [{ kind: LibraryUpdateRecordKind.load }]);
  }

  public addItems(items: AlbumPhoto[]) {
    wireAddCollectionItems(this.coll!.id, items.map((x) => {
      return { photoId: x.wire.id, updateDt: nowAsISOString() }
    }));

  }

  public removeItems(items: AlbumPhoto[]) {
  }

  public setChangeHandler(func: (update: LibraryUpdateRecord[]) => void): void {
    this.changeHandler = func;
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    return this.photos;
  }
}

class QuickCollectionSource extends CollectionPhotoSource {
  public constructor(collId: CollectionId) {
    super(collId);
  }

  protected override async getOrCreateCollection(): Promise<PhotoCollection> {
    await waitLibraryLoaded();

    // at this point we have collection list; find default quick and map to it
    // get the current quick and other collections
    let quickColl: PhotoCollection | null = await getStandardCollection('quick');

    // ensure that we have quick collection
    if (!quickColl) {
      let response = await wireAddCollection({ kind: 'quick', name: '', createDt: nowAsISOString() });
      quickColl = new PhotoCollection(response.collection);
      collectionMap.set(response.collection.id as CollectionId, quickColl);
    }

    return quickColl;
  }
}