import { ViewMode, getState, updateState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { isEqualDay, isEqualMonth } from "../lib/date";
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { addQuickCollection } from "./CollectionStore";

export function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  let viewMode = getState().viewMode;

  if (event.key === 'Escape') {
    if (viewMode !== ViewMode.grid) {
      updateState({ viewMode: ViewMode.grid });
    }
    event.preventDefault();
  } else {
    if (!getState().currentList || !selectionManager.lastSelectedPhoto) {
      return;
    }

    switch (event.key) {
      case 'Enter': {
        if (viewMode === ViewMode.grid) {
          updateState({ viewMode: ViewMode.zoom });
        }
        break;
      }
      case 'ArrowLeft': {
        let idx = selectionManager.getLastSelectedIndex(getState().currentList.photos);
        if (idx !== -1) {
          idx = Math.max(0, idx - 1);
          selectionManager.reset([getState().currentList.photos[idx]]);
        }
        break;
      }
      case 'ArrowRight': {
        let idx = selectionManager.getLastSelectedIndex(getState().currentList.photos);
        if (idx !== -1) {
          idx = Math.min(getState().currentList.photoCount - 1, idx + 1);
          selectionManager.reset([getState().currentList.photos[idx]]);
        }
        break;
      }
      case 'ArrowUp': {
        let photos = getState().currentList.photos;
        let rowIdx = getState().currentList.getRow(selectionManager.lastSelectedPhoto!.id);
        let idx = getState().currentList.findIndexById(selectionManager.lastSelectedPhoto!.id);
        for (; idx >= 0; idx--) {
          if (getState().currentList.getRow(photos[idx].id) !== rowIdx) {

            let rowIdx = getState().currentList.getRow(photos[idx].id);
            for (; idx >= 0; idx--) {
              let row = getState().currentList.getRow(photos[idx].id);
              if (row !== rowIdx) {
                selectionManager.reset([photos[idx + 1]]);
                return;
              }
            }
          }
        }
        break;
      }
      case 'ArrowDown': {
        let photos = getState().currentList.photos;
        let rowIdx = getState().currentList.getRow(selectionManager.lastSelectedPhoto!.id);
        let idx = getState().currentList.findIndexById(selectionManager.lastSelectedPhoto!.id);
        for (; idx < photos.length; idx++) {
          if (getState().currentList.getRow(photos[idx].id) !== rowIdx) {
            selectionManager.reset([photos[idx]]);
            return;
          }
        }
        break;
      }
      case 'p':
        selectionManager.forEach((x) => { x.favorite = 1; });
        break;
      case 'x':
        selectionManager.forEach((x) => { x.favorite = -1; });
        break;
      case 'b':
        addQuickCollection([...selectionManager.items.values()]);
        break;
    }
  }
}

class MouseController {
  private lastClick: number = -1;

  /**
   * return true if double click
   */
  public onClick(event: React.MouseEvent<HTMLImageElement>): boolean {
    if (this.lastClick + 300 > event.timeStamp) {
      this.lastClick = -1;
      return true;
    } else {
      this.lastClick = event.timeStamp;
      return false;
    }
  }
}


let mouseController = new MouseController();

export function handlePhotoClick(event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) {
  if (mouseController.onClick(event)) {
    selectionManager.reset([photo]);
    updateState({ viewMode: ViewMode.zoom });
    event.preventDefault();
  } else {
    if (!(event.shiftKey || event.ctrlKey)) {
      selectionManager.clear();
    }
    if (event.shiftKey) {
      let photos = getState().currentList;
      let idxCurrent = selectionManager.getLastSelectedIndex(photos.photos);
      let idxPhoto = photos.findIndexById(photo.wire.id);

      if (idxCurrent !== -1 && idxPhoto !== -1) {
        let range = (idxCurrent > idxPhoto) ? photos.photos.slice(idxPhoto, idxCurrent) : photos.photos.slice(idxCurrent, idxPhoto + 1);
        selectionManager.add(range);
      } else {
        selectionManager.add([photo]);
      }
    } else {
      selectionManager.add([photo]);
    }
    event.preventDefault();
  }
}

export function handlePhotoSelected(
  event: React.MouseEvent<HTMLImageElement>,
  photo: AlbumPhoto) {
  let selected = selectionManager.isSelected(photo);
  let index = getState().currentList.findIndexById(photo.wire.id);
  if (index === -1) {
    return;
  }

  let photos = getState().currentList;
  let lastIndex = selectionManager.getLastSelectedIndex(photos.photos);
  if (event.shiftKey && lastIndex !== -1) {
    let batch: AlbumPhoto[] = [];
    if (lastIndex > index) {
      for (let i = index; i < lastIndex; i++) {
        batch.push(getState().currentList.photos[i])
      }
    } else {
      for (let i = index; i > lastIndex; i--) {
        batch.push(getState().currentList.photos[i])
      }
    }
    if (!selected) {
      selectionManager.add(batch);
    } else {
      selectionManager.remove(batch);
    }
  } else {
    if (!selected) {
      selectionManager.clear();
      selectionManager.add([photo]);
    } else {
      selectionManager.remove([photo]);
    }
  }
}

export function handleDateSelected(val: boolean, row: AlbumRow) {
  let filtered = (row.kind === RowKind.month) ?
    getState().currentList.filter((x: AlbumPhoto) => {
      return isEqualMonth(x.originalDate, row.dt!);
    })
    : getState().currentList.filter((x: AlbumPhoto) => {
      return isEqualDay(x.originalDate, row.dt!);
    });
  selectionManager.clear();
  if (val) {
    selectionManager.add(filtered);
  }
}

