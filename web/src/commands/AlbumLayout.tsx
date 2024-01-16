import { CSSProperties, useEffect, useRef, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, RowKind } from "../photo/AlbumPhoto";
import { DateRowLayout, PhotoRowLayout } from "../photo/RowLayout";
import { selectionManager } from "./SelectionManager";
import { PhotoLayout } from "../photo/PhotoLayout";
import { Measure } from "../Measure";
import { makeByMonthRows } from "../photo/MakeRows";
import { Command, ViewMode, addAnyCommandHandler, addOnStateChanged, getState, removeAnyCommandHandler, removeOnStateChanged, updateState } from "./AppState";
import { handleDateSelected, handleKeyDown, handlePhotoClick, handlePhotoSelected } from "./AlbumInput";

type PhotoAlbumProps = {
  width: number,
  height: number
}

const photoPadding = 20;

/**
 * render 2 photos; switches visibility between them
 */
function renderPreviewPhotos(width: number, height: number): JSX.Element[] {
  let elements: JSX.Element[] = [];

  let photos = getState().currentList;
  let idx = photos.findPhotoPos(selectionManager.lastSelectedPhoto);
  console.log("preview: " + idx);

  if (idx === -1) {
    return elements;
  }


  let prevIdx = photos.getPrev(idx);
  if (prevIdx >= 0) {
    let photo = photos.getItem(prevIdx);
    elements.push(
      (<PhotoLayout
        className="Photo"
        visibility="hidden"
        photo={photo!}
        padding={0}
        viewMode={ViewMode.zoom}
        width={width}
        height={height}
        selected={true}></PhotoLayout>));
  }

  {
    let photo = photos.getItem(idx);
    elements.push(
      (<PhotoLayout
        className="Photo"
        visibility="visible"
        photo={photo!}
        padding={0}
        viewMode={ViewMode.zoom}
        width={width}
        height={height}
        selected={true}></PhotoLayout>));
  }

  let nextIdx = photos.getNext(idx);
  if (nextIdx >= 0) {
    let photo = photos.getItem(nextIdx);
    elements.push(
      (<PhotoLayout
        className="Photo"
        visibility="hidden"
        photo={photo!}
        padding={0}
        viewMode={ViewMode.zoom}
        width={width}
        height={height}
        selected={true}></PhotoLayout>));
  }

  return elements;
}

export function PhotoAlbum(props: PhotoAlbumProps) {
  // react-window has a bug with updates
  // it caches height of items for variable height based on function object
  // so we have to give it different function when photos change
  const [rows, setRows] = useState<AlbumRow[] | null>(getState().rows);
  const [viewMode, setViewMode] = useState(getState().viewMode);
  // simple counter for refresh
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    console.log("PhotoAlbum: useEffect:" + getState().currentList?.photoCount);

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {
      console.log('Selection changed');

      if (listRef.current) {
        if (rows && rows.length > 0 && selectionManager.lastSelectedPhoto) {
          let idx = getState().currentList.getRow(selectionManager.lastSelectedPhoto);
          console.log("ScrollSelect to " + idx);
          if (idx !== -1) {
            // @ts-ignore
            listRef.current.scrollToItem(idx);
          }
        }
      }
    });

    // add listener to commands
    let cmdId = addAnyCommandHandler((cmd: Command, ...args: any[]) => {
      if (cmd == Command.ScrollAlbum) {
        if (listRef.current) {
          if (rows) {
            let dt = args[0] as { year: number, month: number };
            let idx = rows.findIndex((row: AlbumRow) => row.dt &&
              (dt.year >= row.dt!.getFullYear() && dt.month >= row.dt!.getMonth()))
            console.log("ScrollAlbum to " + idx);
            if (idx >= 0) {
              // @ts-ignore
              listRef.current.scrollToItem(idx);
            }
          }
        }
      } else if (cmd === Command.SetFocusAlbum) {
        if (ref.current) {
          // @ts-ignore
          ref.current.focus();
        }
      }
    });

    // add listener for state changes
    let stateId = addOnStateChanged(() => {
      updateRows();

      if (viewMode !== getState().viewMode) {
        setViewMode(getState().viewMode);
      }
    });

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
      removeAnyCommandHandler(cmdId);
      removeOnStateChanged(stateId);
    }
  }, [props.width, viewMode, ref]);

  function updateRows() {
    let rows = getState().rows;
    if (!rows) {
      rows = makeByMonthRows(getState().currentList, props.width, photoPadding);
      console.log('updateRows:' + rows.length);
      updateState({ rows: rows });

      setRows(rows);

      // update layout when we navigate
      if (listRef.current) {
        console.log("PhotoAlbum.updateRows: reset scroll");
        // @ts-ignore
        listRef.current.resetAfterIndex(0);
        if (rows && rows.length > 0) {
          // @ts-ignore
          listRef.current.scrollToItem(0);
        }
      }
    }
  }

  function getRowHeight(idx: number): number {
    if (!rows || idx >= rows.length) {
      return 0;
    }

    let row = rows![idx];
    if (row.kind === RowKind.photos) {
      return rows![idx].height + rows![idx].padding * 2;
    } else if (row.kind === RowKind.month) {
      return getState().monthRowHeight + 10;
    } else {
      return getState().dayRowHeight + 10;
    }
  }

  function renderRow(props: ListChildComponentProps) {
    if (!rows) {
      return null;
    }

    let row = rows[props.index];
    if (row.kind !== RowKind.photos) {
      return (
        <DateRowLayout
          key={row.key}
          style={props.style}
          row={row}
          onSelected={handleDateSelected}
          selected={false} />
      )
    } else {
      return (
        <PhotoRowLayout
          key={row.key}
          style={props.style}
          row={row}
          onClick={handlePhotoClick}
          onSelected={handlePhotoSelected}></PhotoRowLayout >
      )
    }
  }

  updateRows();

  if (viewMode !== getState().viewMode) {
    setViewMode(getState().viewMode);
  }

  let showList = (viewMode === ViewMode.grid || !selectionManager.lastSelectedPhoto);
  let listStyle: CSSProperties = {
    visibility: showList ? "visible" : "hidden",
    height: props.height,
    width: props.width,
    position: 'absolute',
  }

  function onMeasureDateHeader(height: number, kind: RowKind) {
    console.log("Measure: " + height);
    if (kind === RowKind.month) {
      updateState({ monthRowHeight: height });
    } else {
      updateState({ dayRowHeight: height });
    }
    if (getState().dayRowHeight && getState().monthRowHeight) {
      updateState({ viewMode: ViewMode.grid });
    }
  }


  if (viewMode === ViewMode.measure) {
    return (
      <div>
        <Measure onMeasured={(width: number, height: number) => onMeasureDateHeader(height, RowKind.month)}>
          <DateRowLayout row={{ key: 0, kind: RowKind.month, dt: new Date(), height: 0, padding: 0 }} />
        </Measure>
        <Measure onMeasured={(width: number, height: number) => onMeasureDateHeader(height, RowKind.day)}>
          <DateRowLayout row={{ key: 0, kind: RowKind.day, dt: new Date(), height: 0, padding: 0 }} />
        </Measure>
      </div>)
  } else {
    return (
      <div className='AlbumLayout'
        tabIndex={0}
        ref={ref}
        onKeyDown={handleKeyDown}>
        <List
          ref={listRef}
          style={listStyle}
          height={props.height}
          width={props.width}
          itemCount={(rows) ? rows.length : 0}
          itemSize={getRowHeight}
        >
          {renderRow}
        </List>
        {
          (!showList) ? (
            renderPreviewPhotos(props.width, props.height)
          ) : null
        }
      </div >);
  }
}
