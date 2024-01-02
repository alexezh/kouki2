import { CSSProperties, useEffect, useRef, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow } from "./AlbumPhoto";
import { DayRowLayout, PhotoRowLayout } from "./PhotoRowLayout";
import { selectionManager } from "../commands/SelectionManager";
import { PhotoLayout } from "./PhotoLayout";
import { Measure } from "../Measure";
import { isEqualDay, toDayStart } from "../lib/date";
import React from "react";
import { makeByMonthRows, makeRows } from "./MakeRows";
import { addQuickCollection } from "./PhotoStore";
import { Command, ViewMode, addCommandHandler, addOnStateChanged, getState, removeCommandHandler, removeOnStateChanged, updateState } from "../commands/AppState";
import { handleKeyDown, handlePhotoClick, handlePhotoSelected } from "./AlbumInput";

type PhotoAlbumProps = {
  width: number,
  height: number
}

const photoPadding = 20;



type RowsDef = {
  photos: AlbumPhoto[];
  rows: AlbumRow[];
  rowHeight: (idx: number) => number
}

export function PhotoAlbum(props: PhotoAlbumProps) {
  // react-window has a bug with updates
  // it caches height of items for variable height based on function object
  // so we have to give it different function when photos change
  const [source, setSource] = useState<RowsDef>({ photos: [], rows: [], rowHeight: (idx: number): number => { return 0; } });
  const [viewMode, setViewMode] = useState(ViewMode.measure);
  const [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(null);
  const [dateRowHeight, setDateRowHeight] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {
      if (selectionManager.lastSelectedPhoto !== currentPhoto) {
        setCurrentPhoto(selectionManager.lastSelectedPhoto);
      }
    });

    // add listener to commands
    let cmdId = addCommandHandler((cmd: Command, ...args: any[]) => {
      if (cmd != Command.ScrollAlbum) {
        return;
      }

      if (listRef.current) {
        if (source) {
          let idx = source.rows.findIndex((row: AlbumRow) => row.dt && (args[0] as Date).valueOf() > row.dt!.valueOf())
          if (idx > 0) {
            // @ts-ignore
            listRef.current.scrollToItem(idx);
          }
        }
      }
    });

    // add listener for state changes
    let stateId = addOnStateChanged(() => {
      updateSource();

      if (viewMode !== getState().viewMode) {
        setViewMode(getState().viewMode);
      }
    });

    updateSource();

    if (viewMode !== getState().viewMode) {
      setViewMode(getState().viewMode);
    }

    if (currentPhoto !== selectionManager.lastSelectedPhoto) {
      setCurrentPhoto(currentPhoto);
    }

    // update layout
    if (listRef.current) {
      // @ts-ignore
      listRef.current.resetAfterIndex(0);
      if (source && source.rows.length > 0) {
        // @ts-ignore
        listRef.current.scrollToItem(0);
      }
    }

    // reset to grid mode
    if (viewMode !== ViewMode.measure) {
      setViewMode(ViewMode.grid);
    }

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
      removeCommandHandler(cmdId);
      removeOnStateChanged(stateId);
    }
  }, [props.width]);

  function updateSource() {
    if (source.photos === getState().currentList) {
      return;
    }

    let rows = getState().rows;
    if (!getState().rows) {
      rows = makeByMonthRows(getState().currentList, props.width, photoPadding);
      updateState({ rows: rows });
    }

    setSource({
      photos: getState().currentList,
      rows: rows!,
      rowHeight: (idx: number): number => {
        let row = rows![idx];
        if (row.dt) {
          return dateRowHeight + 10;
        } else {
          return rows![idx].height + rows![idx].padding * 2;
        }
      }
    });
  }

  function handleDateSelected(val: boolean, dt: Date) {
    let filtered = getState().currentList.filter((x: AlbumPhoto) => {
      return isEqualDay(x.originalDate, dt);
    });
    selectionManager.clear();
    if (val) {
      selectionManager.add(filtered);
    }
  }

  let albumProps = props;
  function renderRow(props: ListChildComponentProps) {
    let row = source.rows[props.index];
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
          onSelected={handlePhotoSelected}></PhotoRowLayout >
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
      <div className='AlbumLayout' tabIndex={0}
        onKeyDown={handleKeyDown}>
        <List
          ref={listRef}
          style={listStyle}
          height={props.height}
          width={props.width}
          itemCount={source.rows.length}
          itemSize={source.rowHeight}
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
