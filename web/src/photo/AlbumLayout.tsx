import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, RowKind } from "./AlbumPhoto";
import { DateRowLayout } from "./RowLayout";
import { selectionManager } from "../commands/SelectionManager";
import { Measure } from "../Measure";
import { ViewMode, addOnStateChanged, getState, removeOnStateChanged, updateState } from "../commands/AppState";
import { handleKeyDown } from "./AlbumInput";
import { StripeLayout } from "./StripeLayout";
import { PhotoViewer } from "./PhotoViewer";
import { GridLayout } from "./GridLayout";

export const photoPadding = 20;

type PhotoAlbumProps = {
  width: number,
  height: number
}

export function AlbumLayout(props: PhotoAlbumProps) {
  const [viewMode, setViewMode] = useState(getState().viewMode);

  useEffect(() => {
    console.log("AlbumLayout: useEffect:" + getState().navList?.photoCount);

    // add listener for state changes
    let stateId = addOnStateChanged(() => {
      if (viewMode !== getState().viewMode) {
        setViewMode(getState().viewMode);
      }
    });

    return () => {
      removeOnStateChanged(stateId);
    }
  }, [viewMode]);

  if (viewMode !== getState().viewMode) {
    setViewMode(getState().viewMode);
  }

  // we are keeping list at all time to avoid scrolling
  let listStyle: CSSProperties = {
    visibility: (viewMode === ViewMode.grid) ? "visible" : "hidden",
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
      <div className='Album-layout'
        tabIndex={0}
        onKeyDown={handleKeyDown}>
        <GridLayout
          style={listStyle}
          height={props.height}
          width={props.width}
        />
        {
          (viewMode === ViewMode.stripe) ? (
            <StripeLayout
              width={props.width}
              height={props.height}
              padding={photoPadding} />
          ) : null
        }
        {
          (viewMode === ViewMode.zoom) ? (
            <PhotoViewer width={props.width} height={props.height} getImage={(offs: number): AlbumPhoto | null => {

              let photos = getState().workList;
              let idx = photos.findPhotoPos(selectionManager.lastSelectedPhoto);
              console.log("preview: " + idx);
              if (idx === -1) {
                return null;
              }

              if (offs === -1) {
                return photos.getItem(photos.getPrev(idx));
              } else if (offs === 1) {
                return photos.getItem(photos.getNext(idx));
              } else {
                return selectionManager.lastSelectedPhoto;
              }
            }} />
          ) : null
        }
      </div >);
  }
}
