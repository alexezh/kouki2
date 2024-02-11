import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, RowKind } from "./AlbumPhoto";
import { DateRowLayout } from "./RowLayout";
import { selectionManager } from "../commands/SelectionManager";
import { Measure } from "../Measure";
import { ViewMode, addOnStateChanged, getAppState, removeOnStateChanged, updateAppState } from "../commands/AppState";
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
  const [viewMode, setViewMode] = useState(getAppState().viewMode);

  useEffect(() => {
    console.log("AlbumLayout: useEffect:" + getAppState().navList?.photoCount);

    // add listener for state changes
    let stateId = addOnStateChanged(() => {
      if (viewMode !== getAppState().viewMode) {
        setViewMode(getAppState().viewMode);
      }
    });

    return () => {
      removeOnStateChanged(stateId);
    }
  }, [viewMode]);

  if (viewMode !== getAppState().viewMode) {
    setViewMode(getAppState().viewMode);
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
      updateAppState({ monthRowHeight: height });
    } else {
      updateAppState({ dayRowHeight: height });
    }
    if (getAppState().dayRowHeight && getAppState().monthRowHeight) {
      updateAppState({ viewMode: ViewMode.grid });
    }
  }


  if (viewMode === ViewMode.measure) {
    return (
      <div>
        <Measure onMeasured={(width: number, height: number) => onMeasureDateHeader(height, RowKind.month)}>
          <DateRowLayout row={{ key: '0', hash: 0, kind: RowKind.month, dt: new Date(), height: 0, padding: 0 }} />
        </Measure>
        <Measure onMeasured={(width: number, height: number) => onMeasureDateHeader(height, RowKind.day)}>
          <DateRowLayout row={{ key: '0', hash: 0, kind: RowKind.day, dt: new Date(), height: 0, padding: 0 }} />
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
              hideStackIcon={true}
              padding={photoPadding} />
          ) : null
        }
        {
          (viewMode === ViewMode.zoom) ? (
            <PhotoViewer width={props.width} height={props.height} photos={getAppState().workList} />
          ) : null
        }
      </div >);
  }
}
