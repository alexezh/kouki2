import { CSSProperties, useEffect, useRef, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { DateRowLayout, PhotoRowLayout } from "./RowLayout";
import { selectionManager } from "../commands/SelectionManager";
import { PhotoLayout } from "./PhotoLayout";
import { Measure } from "../Measure";
import { isEqualDay, toDayStart } from "../lib/date";
import React from "react";
import { makeByMonthRows, makeRows } from "./MakeRows";
import { addQuickCollection } from "./PhotoStore";
import { Command, ViewMode, addCommandHandler, addOnStateChanged, getState, removeCommandHandler, removeOnStateChanged, updateState } from "../commands/AppState";
import { handleDateSelected, handleKeyDown, handlePhotoClick, handlePhotoSelected } from "./AlbumInput";

type PhotoAlbumProps = {
  width: number,
  height: number
}

const photoPadding = 20;
let nextId = 1;

type RowsDef = {
  photos: AlbumPhoto[];
  rows: AlbumRow[];
}

export function PhotoAlbum(props: PhotoAlbumProps) {
  // react-window has a bug with updates
  // it caches height of items for variable height based on function object
  // so we have to give it different function when photos change
  const [rows, setRows] = useState<AlbumRow[] | null>(getState().rows);
  const [viewMode, setViewMode] = useState(getState().viewMode);
  const [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(selectionManager.lastSelectedPhoto);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    console.log("PhotoAlbum: effect");

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {
      if (selectionManager.lastSelectedPhoto !== currentPhoto) {
        setCurrentPhoto(selectionManager.lastSelectedPhoto);
      }
    });

    // add listener to commands
    let cmdId = addCommandHandler((cmd: Command, ...args: any[]) => {
      if (cmd == Command.ScrollAlbum) {
        if (listRef.current) {
          if (rows) {
            let dt = args[0] as { year: number, month: number };
            let idx = rows.findIndex((row: AlbumRow) => row.dt &&
              (dt.year >= row.dt!.getFullYear() && dt.month >= row.dt!.getMonth()))
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
      removeCommandHandler(cmdId);
      removeOnStateChanged(stateId);
    }
  }, [getState().currentList, getState().rows, props.width, viewMode, ref, currentPhoto]);

  function updateRows() {
    let rows = getState().rows;
    if (!rows) {
      rows = makeByMonthRows(getState().currentList.photos, props.width, photoPadding);
      updateState({ rows: rows });

      setRows(rows);

      // update layout when we navigate
      if (listRef.current) {
        console.log("PhotoAlbum: reset scroll");
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
          style={props.style}
          row={row}
          onSelected={handleDateSelected}
          selected={false} />
      )
    } else {
      return (
        <PhotoRowLayout
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

  if (currentPhoto !== selectionManager.lastSelectedPhoto) {
    setCurrentPhoto(currentPhoto);
  }

  let showList = (viewMode === ViewMode.grid || !currentPhoto);
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
          <DateRowLayout row={{ kind: RowKind.month, dt: new Date(), height: 0, padding: 0 }} />
        </Measure>
        <Measure onMeasured={(width: number, height: number) => onMeasureDateHeader(height, RowKind.day)}>
          <DateRowLayout row={{ kind: RowKind.day, dt: new Date(), height: 0, padding: 0 }} />
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
            <PhotoLayout
              key={currentPhoto!.wire.hash}
              className="Photo"
              visibility={showList ? "hidden" : "visible"}
              photo={currentPhoto!}
              padding={0}
              width={props.width}
              height={props.height}
              selected={true}></PhotoLayout>
          ) : null
        }
      </div >);
  }
}
