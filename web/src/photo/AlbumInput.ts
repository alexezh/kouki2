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
    if (viewMode === ViewMode.zoom && event.key === 'ArrowLeft') {
      let idx = selectionManager.getLastSelectedIndex(getState().currentList.photos);
      if (idx !== -1) {
        idx = Math.max(0, idx - 1);
        selectionManager.reset([getState().currentList.photos[idx]]);
      }
    } else if (viewMode === ViewMode.zoom && event.key === 'ArrowRight') {
      let idx = selectionManager.getLastSelectedIndex(getState().currentList.photos);
      if (idx !== -1) {
        idx = Math.min(getState().currentList.photoCount - 1, idx + 1);
        selectionManager.reset([getState().currentList.photos[idx]]);
      }
    } else if (event.key === 'p') {
      selectionManager.forEach((x) => { x.favorite = 1; });
    } else if (event.key === 'x') {
      selectionManager.forEach((x) => { x.favorite = -1; });
    } else if (event.key === 'b') {
      addQuickCollection(() => selectionManager.items.values());
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
      let idxPhoto = photos.findIndex((x) => x === photo);

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
  let index = getState().currentList.findIndex((x) => x === photo);
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

