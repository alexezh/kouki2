import { CSSProperties, useEffect, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, makeRows } from "./PhotoStore";
import { DayRowLayout, PhotoRowLayout } from "./PhotoRowLayout";
import { selectionManager } from "./SelectionManager";
import { PhotoLayout } from "./PhotoLayout";
import { Measure } from "./Measure";
import { isEqualDay, toDayStart } from "./lib/date";

type PhotoAlbumProps = {
  photos: AlbumPhoto[],
  width: number,
  height: number
}

enum ViewMode {
  measure,
  grid,
  zoom
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

function handlePhotoSelected(
  event: React.MouseEvent<HTMLImageElement>,
  photo: AlbumPhoto,
  photos: AlbumPhoto[]) {
  let selected = selectionManager.isSelected(photo);
  let index = photos.findIndex((x) => x === photo);
  if (index === -1) {
    return;
  }

  if (event.shiftKey && selectionManager.lastIndex !== -1) {
    let batch: AlbumPhoto[] = [];
    if (selectionManager.lastIndex > index) {
      for (let i = index; i < selectionManager.lastIndex; i++) {
        batch.push(photos[i])
      }
    } else {
      for (let i = index; i > selectionManager.lastIndex; i--) {
        batch.push(photos[i])
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

  selectionManager.lastIndex = index;
}

export function PhotoAlbum(props: PhotoAlbumProps) {
  const [rows, setRows] = useState([] as AlbumRow[]);
  const [viewMode, setViewMode] = useState(ViewMode.measure);
  const [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(null);
  const [dateRowHeight, setDateRowHeight] = useState(0);

  useEffect(() => {
    setRows(makeRows(props.photos, {
      optimalHeight: 200,
      targetWidth: props.width,
      padding: 5,
      startNewRow: (photo: AlbumPhoto, idx: number, photos: AlbumPhoto[]) => {
        if (idx !== 0) {
          let d1 = photos[idx - 1].originalDate;
          let d2 = photo.originalDate;
          if (isEqualDay(d1, d2)) {
            return null;
          }
        }
        return {
          headerRow: {
            dt: toDayStart(photo.originalDate),
            height: 0
          }
        }
      }
    }));

    // reset to grid mode
    if (viewMode !== ViewMode.measure) {
      setViewMode(ViewMode.grid);
    }
  }, [props.photos, props.width]);

  function getItemHeight(idx: number): number {
    let row = rows[idx];
    if (row.dt) {
      return dateRowHeight + 10;
    } else {
      return rows[idx].height;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (viewMode !== ViewMode.grid) {
        setViewMode(ViewMode.grid);
      }
      event.preventDefault();
    } else {
      if (viewMode === ViewMode.zoom) {
        if (event.key === 'ArrowLeft') {
          let idx = props.photos.findIndex((x) => x === currentPhoto);
          if (idx !== -1) {
            idx = Math.max(0, idx - 1);
            setCurrentPhoto(props.photos[idx]);
          }
        } else if (event.key === 'ArrowRight') {
          let idx = props.photos.findIndex((x) => x === currentPhoto);
          if (idx !== -1) {
            idx = Math.min(props.photos.length - 1, idx + 1);
            setCurrentPhoto(props.photos[idx]);
          }
        }
      } else if (event.key === 'KeyP') {
        selectionManager.forEach((x) => { x.favorite = 1; });
      } else if (event.key === 'KeyX') {
        selectionManager.forEach((x) => { x.favorite = -1; });
      }
    }
  }

  function handlePhotoClick(event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) {
    if (mouseController.onClick(event)) {
      selectionManager.clear();
      selectionManager.add([photo]);

      setViewMode(ViewMode.zoom);
      setCurrentPhoto(photo);
      event.preventDefault();
    } else {
      if (!event.shiftKey) {
        selectionManager.clear();
      }
      selectionManager.add([photo]);
      event.preventDefault();
    }
  }

  function handleDateSelected(val: boolean, dt: Date) {
    let filtered = props.photos.filter((x: AlbumPhoto) => {
      return isEqualDay(x.originalDate, dt);
    });
    selectionManager.clear();
    if (val) {
      selectionManager.add(filtered);
    }
  }

  let albumProps = props;
  function renderRow(props: ListChildComponentProps) {
    let row = rows[props.index];
    if (row.dt) {
      return (
        <DayRowLayout
          style={props.style}
          dt={toDayStart(row.dt!)}
          onSelected={handleDateSelected}
          selected={false} />
      )
    } else {
      return (
        <PhotoRowLayout
          style={props.style}
          row={row}
          onClick={handlePhotoClick}
          onSelected={(e, photo) => handlePhotoSelected(e, photo, albumProps.photos)}></PhotoRowLayout >
      )
    }
  }

  let showList = (viewMode === ViewMode.grid || !currentPhoto);
  let listStyle: CSSProperties = {
    visibility: showList ? "visible" : "hidden",
    height: props.height,
    width: props.width,
    position: 'absolute',
  }
  let photoStyle: CSSProperties = {
    visibility: showList ? "hidden" : "visible",
    height: props.height,
    width: props.width,
    position: 'absolute',
  }

  function onMeasureDayHeader(width: number, height: number) {
    setDateRowHeight(height);
    setViewMode(ViewMode.grid);
  }

  if (viewMode === ViewMode.measure) {
    return (
      <Measure onMeasured={onMeasureDayHeader}>
        <DayRowLayout dt={new Date()} />
      </Measure>)
  } else {
    return (
      <div className="Container" tabIndex={0} onKeyDown={handleKeyDown}>
        <List
          style={listStyle}
          height={props.height}
          itemCount={rows.length}
          itemSize={getItemHeight}
          width={props.width}
        >
          {renderRow}
        </List>
        {
          (currentPhoto) ? (
            <PhotoLayout key={currentPhoto!.wire.hash}
              className="Photo"
              style={photoStyle}
              photo={currentPhoto!}
              margin={0}
              width={props.width}
              height={props.height}
              selected={true}></PhotoLayout>
          ) : null
        }
      </div>);
  }
}
