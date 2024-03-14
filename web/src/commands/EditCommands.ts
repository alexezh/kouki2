import { AlbumPhoto, PhotoId } from "../photo/AlbumPhoto";
import { ViewMode, closePhotoStack, getAppState, updateAppState } from "./AppState";
import { selectionManager } from "./SelectionManager";
import { Command, addCommandHandler } from "./Commands";
import { addStack, removeStack } from "../photo/PhotoStore";
import { PhotoList, PhotoListPos } from "../photo/PhotoList";
import { createQuickCollection, getQuickCollectionList } from "../photo/LoadPhotoList";
import { UpdatePhotoContext } from "../photo/UpdatePhotoContext";
import { ReactionKind } from "../lib/photoclient";

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

export function onAddReaction(val: ReactionKind) {
  console.log('onAddReaction');

  let ctx = new UpdatePhotoContext();
  selectionManager.forEach((x) => { x.addReaction(val, ctx); });
  ctx.commit();
}

export function onClearReactions(val: ReactionKind) {
  console.log('onClearReaction');

  let ctx = new UpdatePhotoContext();
  selectionManager.forEach((x) => { x.clearReactions(ctx); });
  ctx.commit();
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
  else {
    let list = getAppState().workList;
    let lastPos = list.findPhotoPos(selectionManager.lastSelectedPhoto);
    if (lastPos <= 0) {
      return;
    }

    let selected = selectionManager.selectedPhotos;

    let ctx = new UpdatePhotoContext();
    if (selected.size === 1) {
      let photo = selected.values().next().value;
      let prevPhoto = list.getItem(list.getPrev(lastPos));

      // if previous photo is stack, add to existing stack
      // otherwise create new stack
      if (prevPhoto.stackId) {
        addStack(prevPhoto.stackId, photo, ctx);
      } else if (photo.stackId) {
        addStack(photo.stackId, prevPhoto, ctx);
      } else {
        addStack(prevPhoto.id, prevPhoto, ctx);
        addStack(prevPhoto.id, photo, ctx);
      }
    } else {
      let stackId: number | undefined = undefined;
      // if any of photos is stack, combine into this stack
      for (let [key, photo] of selected) {
        if (!photo.stackId) {
          stackId = photo.stackId;
          break;
        }
      }

      if (!stackId) {
        let photo = selected.values().next().value;
        addStack(photo.id, photo, ctx);
        stackId = photo.id;
      }

      for (let [key, x] of selected) {
        if (stackId !== x.id) {
          addStack(stackId! as PhotoId, x, ctx);
        }
      }
    }

    ctx.commit();

    preserveSelection(list, lastPos);
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

    let ctx = new UpdatePhotoContext();

    for (let [key, photo] of selectionManager.selectedPhotos) {
      let pos = photos.findPhotoPos(photo);
      if (pos < 0) {
        return;
      }

      removeStack(photo, ctx);

      let nextSelect = photos.getNext(photo);
      if (nextSelect !== -1) {
        nextSelect = photos.getPrev(photo);
      }
      photos.removePhoto(photo);
      if (nextSelect !== -1) {
        selectionManager.reset([photos.getItem(nextSelect)]);
      }
    }

    ctx.commit();
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
  getQuickCollectionList().addPhotos(photos);
}

function onNewQuickCollection() {
  createQuickCollection();
}

export function registerEditCommands() {
  addCommandHandler(Command.AddStack, onAddStack);
  addCommandHandler(Command.MarkHidden, onMarkHidden);
  addCommandHandler(Command.RemoveStack, onRemoveStack);
  addCommandHandler(Command.AddQuickCollection, onAddQuickCollection);
  addCommandHandler(Command.CreateQuickCollection, onNewQuickCollection);
  addCommandHandler(Command.NavigateBack, onNavigateBack);
  addCommandHandler(Command.AddReaction, onAddReaction);
  addCommandHandler(Command.ClearReactions, onClearReactions);
}
