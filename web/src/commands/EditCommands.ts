import { AlbumPhoto } from "../photo/AlbumPhoto";
import { ViewMode, closePhotoStack, getAppState, updateState } from "./AppState";
import { selectionManager } from "./SelectionManager";
import { Command, addCommandHandler, invokeCommand } from "./Commands";
import { getQuickCollection } from "../photo/CollectionStore";
import { addStack, removeStack } from "../photo/PhotoStore";

export function onMarkFavorite() {
  selectionManager.forEach((x) => { x.favorite = 1; });
}

export function onMarkRejected() {
  selectionManager.forEach((x) => { x.favorite = -1; });
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

    if (prevPhoto.stackId) {
      addStack(prevPhoto.stackId, photo);
    } else {
      addStack(prevPhoto.id, prevPhoto);
      addStack(prevPhoto.id, photo);
    }

    // move selection to next photo
    let nextPhoto = list.getNext(pos);
    if (nextPhoto !== -1) {
      selectionManager.reset([list.getItem(nextPhoto)]);
    } else {
      selectionManager.reset([prevPhoto]);
    }
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
    let list = getAppState().workList;
    for (let [key, photo] of selectionManager.selectedPhotos) {
      let pos = list.findPhotoPos(photo);
      if (pos < 0) {
        return;
      }

      removeStack(photo);
    }

    selectionManager.clear();
  }
}

function onNavigateBack() {
  if (getAppState().viewMode === ViewMode.stripe) {
    closePhotoStack();
  } else if (getAppState().viewMode !== ViewMode.grid) {
    updateState({ viewMode: ViewMode.grid });
  }
}

function onAddQuickCollection() {

}

export function addQuickCollection(photos: AlbumPhoto[]) {
  getQuickCollection().addPhotos(photos);
}

export function registerEditCommands() {
  addCommandHandler(Command.MarkFavorite, onMarkFavorite);
  addCommandHandler(Command.MarkRejected, onMarkRejected);
  addCommandHandler(Command.AddStack, onAddStack);
  addCommandHandler(Command.RemoveStack, onRemoveStack);
  addCommandHandler(Command.AddQuickCollection, onAddQuickCollection);
  addCommandHandler(Command.NavigateBack, onNavigateBack);
}
