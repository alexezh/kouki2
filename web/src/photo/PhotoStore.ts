import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoId } from "./AlbumPhoto";
import { WirePhotoEntry, wireGetCorrelation, wireGetPhotos } from "../lib/photoclient";
import { WeakEventSource } from "../lib/synceventsource";
import { loadCollections } from "./CollectionStore";
import { loadFolders } from "./FolderStore";
import { UpdatePhotoContext } from "./UpdatePhotoContext";
import { substractYears } from "../lib/date";

export const photoLibraryMap = new Map<PhotoId, AlbumPhoto>();
export const stackMap = new Map<PhotoId, ReadonlyArray<PhotoId>>();
export const libraryChanged = new WeakEventSource<LibraryUpdateRecord[]>();
let loaded = false;
let loadWaiters: (() => void)[] = [];
let maxPhotoId: number = 0;
let startDt: Date | undefined = substractYears(new Date(), 3);

export function getStartDt(): Date | undefined {
  return startDt;
}

export function invokeLibraryChanged(updates: LibraryUpdateRecord[]) {
  libraryChanged.invoke(updates);
}

export async function waitLibraryLoaded(): Promise<void> {
  if (loaded) {
    return;
  }

  let promise = new Promise<void>((resolve) => {
    loadWaiters.push(resolve);
  });

  return promise;
}

/**
 * invoked when any photo is changed
 */
function completeLoad() {
  if (!loaded) {
    loaded = true;

    for (let resolve of loadWaiters) {
      resolve();
    }
  }

  setTimeout(async () => {
    libraryChanged.invoke([{ kind: LibraryUpdateRecordKind.load }]);
  });
}

export async function loadLibrary(options: { minId?: number, startDt?: Date }) {
  console.log("loadLibrary:" + maxPhotoId);

  let wirePhotos: WirePhotoEntry[];

  if (options.startDt) {
    maxPhotoId = 0;
    startDt = options.startDt;
    wirePhotos = await wireGetPhotos({ minId: 0, startDt: startDt?.toISOString() });
  } else {
    if (options.minId !== undefined) {
      maxPhotoId = options.minId;
    }

    // get photos from previous max
    wirePhotos = await wireGetPhotos({ minId: maxPhotoId, startDt: startDt?.toISOString() });
  }

  let newPhotos: AlbumPhoto[] = [];

  // for photos with the same ti,e. get similarity
  for (let wirePhoto of wirePhotos) {
    let photo = photoLibraryMap.get(wirePhoto.id as PhotoId);
    if (photo) {
      // nothing do do
    } else {
      photo = new AlbumPhoto(wirePhoto);
      photoLibraryMap.set(wirePhoto.id as PhotoId, photo);
      newPhotos.push(photo);
    }

    maxPhotoId = Math.max(photo.id, maxPhotoId);
  }

  console.log("Added photos: " + newPhotos.length);

  buildStacks(newPhotos);
  processSimilarityIndex(newPhotos);

  await loadCollections();
  loadFolders();

  completeLoad();
}

/**
 * uses originalId to add photos to stack
 */
function processSimilarityIndex(photos: AlbumPhoto[]) {

  // we do not want to send to the wire
  let ctx = new UpdatePhotoContext(false);

  for (let photo of photos) {
    if (!photo.wire.originalId || photo.wire.originalId === photo.wire.id) {
      continue;
    }

    let origPhoto = photoLibraryMap.get(photo.wire.originalId as PhotoId);
    if (!origPhoto) {
      console.log('cannot get original photo ' + photo.wire.originalId);
      continue;
    }

    if (origPhoto.stackId !== origPhoto.id) {
      addStack(origPhoto.stackId, photo, ctx);
    } else {
      addStack(origPhoto.id, origPhoto, ctx);
      addStack(origPhoto.stackId, photo, ctx);
    }
  }
}

function buildStacks(photos: AlbumPhoto[]) {
  stackMap.clear();
  for (let photo of photos) {
    if (photo.wire.stackId) {
      let stack = stackMap.get(photo.wire.stackId as PhotoId);
      if (!stack) {
        stack = [];
        stackMap.set(photo.wire.stackId as PhotoId, stack);
      }

      // for build we can change values
      (stack as PhotoId[]).push(photo.id);
    }
  }

  // update stack cover
  let ctx = new UpdatePhotoContext(false);
  for (let [stackId, stack] of stackMap) {
    updateStackCover(stack, ctx);
    // this is hack for old version which did not store stackId
    // no longer needed
    // if (orig && orig.wire.stackId != stackId) {
    //   (stack as PhotoId[]).push(orig.id);
    //   orig.wire.stackId = stackId;
    //   wireUpdatePhoto({ hash: orig.wire.hash, stackId: orig.wire.id })
    // } else {
    //   console.log("buildStacks: cannot find photo");
    // }
  }
  // we do not have to generate update
}

function updateStackCover(stack: ReadonlyArray<PhotoId>, ctx: UpdatePhotoContext) {
  let cover: PhotoId | undefined = undefined;

  let favIdx = stack.findIndex((x: PhotoId) => getPhotoById(x)!.favorite);
  if (favIdx === -1) {
    cover = stack[0];
  } else {
    cover = stack[favIdx];
  }

  for (let photo of stack) {
    getPhotoById(photo).setStackHidden(photo !== cover, ctx);
  }
}

export function addStack(stackId: PhotoId, photo: AlbumPhoto, ctx: UpdatePhotoContext) {
  let oldStack = stackMap.get(stackId);
  let stack: PhotoId[];

  // make a copy of stack
  if (!oldStack) {
    stack = [];
  } else {
    stack = [...oldStack];
  }

  let addStackPhoto = (photo: AlbumPhoto) => {
    stackMap.set(stackId, stack);
    stack.push(photo.id);
    photo.wire.stackId = stackId;

    updateStackCover(stack, ctx);

    ctx.addPhoto({ kind: LibraryUpdateRecordKind.update, photo: photo, stackId: stackId })
    photo.invokeOnChanged();
  }

  // combine stacks
  if (photo.stackId) {
    let stackPhotos = getStack(photo.stackId);
    if (!stackPhotos) {
      console.log('addStack: cannot get stack');
      return;
    }
    for (let spId of stackPhotos) {
      let sp = getPhotoById(spId);
      addStackPhoto(sp);
    }
  } else {
    addStackPhoto(photo);
  }
}

export function removeStack(photo: AlbumPhoto, ctx: UpdatePhotoContext) {
  if (!photo.hasStack) {
    console.log('removeStack: photo is not in stack');
    return;
  }

  let oldStack = stackMap.get(photo.stackId);
  if (!oldStack) {
    console.log('removeStack: no stack');
    return;
  }

  let idx = oldStack.findIndex((id: PhotoId) => id === photo.id);
  let stack = [...oldStack];
  stack.splice(idx, 1);

  ctx.addPhoto({ kind: LibraryUpdateRecordKind.update, photo: photo, stackId: 0 })
  photo.invokeOnChanged();
}

export function getStack(stackId: PhotoId): ReadonlyArray<PhotoId> | undefined {
  let stack = stackMap.get(stackId);
  return stack;
}

export function filterPhotos(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>, pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
  let filtered: AlbumPhoto[] = [];
  if (Array.isArray(photos)) {
    for (let photo of (photos as AlbumPhoto[])) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  } else {
    for (let [key, photo] of (photos as Map<number, AlbumPhoto>)) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  }

  return filtered;
}

export function sortByDate(photos: AlbumPhoto[]): void {
  photos.sort((x: AlbumPhoto, y: AlbumPhoto) => {
    let xn = x.originalDate.valueOf();
    let yn = y.originalDate.valueOf();
    if (xn > yn) {
      return -1;
    } else if (xn < yn) {
      return 1;
    } else {
      return 0;
    }
  })
}

export function getPhotoById(id: PhotoId): AlbumPhoto {
  let photo = photoLibraryMap.get(id);
  if (!photo) {
    throw new Error('PhotoStore: Cannot find photo ' + id);
  }
  return photo;
}

export function tryGetPhotoById(id: PhotoId): AlbumPhoto | null {
  let photo = photoLibraryMap.get(id);
  if (!photo) {
    return null;
  }
  return photo;
}

