import { AlbumPhoto, UpdatePhotoContext } from "../photo/AlbumPhoto";
import { ViewMode, closePhotoStack, getAppState, updateAppState } from "./AppState";
import { selectionManager } from "./SelectionManager";
import { Command, addCommandHandler } from "./Commands";
import { getQuickCollection } from "../photo/CollectionStore";
import { addStack, removeStack } from "../photo/PhotoStore";
import { PhotoList, PhotoListPos } from "../photo/PhotoList";

export function onMarkFavorite() {
  let ctx = new UpdatePhotoContext();
  selectionManager.forEach((x) => { x.setFavorite(1, ctx); });
  ctx.commit();
}

export function onMarkRejected() {
  let ctx = new UpdatePhotoContext();
  selectionManager.forEach((x) => { x.setFavorite(-1, ctx); });
  ctx.commit();
}

export function onMarkHidden() {
  console.log('onMarkHidden');
  let ctx = new UpdatePhotoContext();

  let list = getAppState().workList;
  let lastPhoto = selectionManager.lastSelectedPhoto;
  if (lastPhoto === null) {
    return;
  }
  let nextPhoto = list.getNext(lastPhoto);
  let prevPhoto = list.getPrev(lastPhoto);

  selectionManager.forEach((x) => { x.setHidden(true, ctx); });
  ctx.commit();

  // move selection to next photo
  if (nextPhoto !== -1) {
    selectionManager.reset([list.getItem(nextPhoto)]);
  } else if (prevPhoto !== -1) {
    selectionManager.reset([list.getItem(prevPhoto)]);
  }
}

/**
 * preserve selection around position
 */
function preserveSelection(list: PhotoList, pos: PhotoListPos) {
  // move selection to next photo
  let nextPhoto = list.getNext(pos);
  if (nextPhoto !== -1) {
    selectionManager.reset([list.getItem(nextPhoto)]);
  } else {
    let prevPhoto = list.getPrev(pos);
    if (prevPhoto !== -1) {
      selectionManager.reset([list.getItem(prevPhoto)]);
    }
  }
}

/**
 * if we only have one photo, add it to previous photo (which becomes a stack)
 * if multiple photos and it is not stack, make a stack to first one
 * and make selection to stack
 */
export function onAddStack() {
  //selectionManager.forEach((x))
  if (selectionManager.selectedPhotos.size === 0) {
    return;
  }
  else if (selectionManager.selectedPhotos.size === 1) {
    let list = getAppState().workList;
    let photoIt = selectionManager.selectedPhotos.values();
    let photo = photoIt.next().value as AlbumPhoto;
    let pos = list.findPhotoPos(photo);
    if (pos <= 0) {
      return;
    }
    let prevPhoto = list.getItem(list.getPrev(pos));

    let ctx = new UpdatePhotoContext();
    // if previous photo is stack, add to existing stack
    // otherwise create new stack
    if (prevPhoto.stackId) {
      addStack(prevPhoto.stackId, photo, ctx);
    } else {
      addStack(prevPhoto.id, prevPhoto, ctx);
      addStack(prevPhoto.id, photo, ctx);
    }
    ctx.commit();

    preserveSelection(list, pos);
  } else {
    console.log('onAddStack: missing multiple photo');
  }
}

export function onRemoveStack() {
  //selectionManager.forEach((x))
  if (selectionManager.selectedPhotos.size === 0) {
    return;
  }
  else {
    let photos = getAppState().workList;
    // if we are removing from stack, update the list
    if (photos.id.kind !== 'stack') {
      console.log('onRemoveStack: not stack list');
      return;
    }

    for (let [key, photo] of selectionManager.selectedPhotos) {
      let pos = photos.findPhotoPos(photo);
      if (pos < 0) {
        return;
      }

      removeStack(photo);

      let nextSelect = photos.getNext(photo);
      if (nextSelect !== -1) {
        nextSelect = photos.getPrev(photo);
      }
      photos.removePhoto(photo);
      if (nextSelect !== -1) {
        selectionManager.reset([photos.getItem(nextSelect)]);
      }
    }
  }
}

function onNavigateBack() {
  if (getAppState().viewMode === ViewMode.stripe) {
    closePhotoStack();
  } else if (getAppState().viewMode !== ViewMode.grid) {
    updateAppState({ viewMode: ViewMode.grid });
  }
}

function onAddQuickCollection() {
  let photos = [...selectionManager.items.values()];
  getQuickCollection().addPhotos(photos);
}

export function registerEditCommands() {
  addCommandHandler(Command.MarkFavorite, onMarkFavorite);
  addCommandHandler(Command.MarkRejected, onMarkRejected);
  addCommandHandler(Command.AddStack, onAddStack);
  addCommandHandler(Command.MarkHidden, onMarkHidden);
  addCommandHandler(Command.RemoveStack, onRemoveStack);
  addCommandHandler(Command.AddQuickCollection, onAddQuickCollection);
  addCommandHandler(Command.NavigateBack, onNavigateBack);
}
