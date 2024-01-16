import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { PhotoLayout } from "./PhotoLayout";
import { selectionManager } from "../commands/SelectionManager";
import { toDayStart } from "../lib/date";
import { ViewMode } from "../commands/AppState";

type PhotoRowLayoutProps = {
  style: CSSProperties,
  row: AlbumRow,
  onClick: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void,
  onSelected: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void
}
export function PhotoRowLayout(props: PhotoRowLayoutProps) {
  function renderRow(row: AlbumRow) {
    let res = [];
    let left = 0;
    let index = 0;
    for (let photo of row.photos!) {
      res.push((<PhotoLayout
        key={photo.wire.hash}
        photo={photo}
        viewMode={ViewMode.grid}
        onClick={props.onClick}
        onSelected={props.onSelected}
        selected={selectionManager.isSelected(photo)}
        padding={props.row.padding}
        left={left} />));

      index++;
      left += Math.round(photo.width * photo.scale) + row.padding * 2;
    }

    return res;
  }

  let style: CSSProperties = { ...props.style, height: props.row.height + props.row.padding * 2 };

  return (
    <div style={style} className="PhotoRow" >
      {renderRow(props.row)}
    </div>
  );
}

type DateRowLayoutProps = {
  /**
   * used by List to communicate position information
   */
  style?: CSSProperties,
  row: AlbumRow,
  selected?: boolean,
  onSelected?: (val: boolean, row: AlbumRow) => void
}
export function DateRowLayout(props: DateRowLayoutProps) {
  let [selected, setSelected] = useState<boolean>(props.selected ?? false);
  function handleSelect() {
    let val = !selected;
    setSelected(val);
    if (props.onSelected) {
      props.onSelected(val, props.row);
    }
  }

  let className: string;
  let text: string | undefined;
  if (props.row.kind === RowKind.month) {
    className = "MonthHeaderRow";

    const options: Intl.DateTimeFormatOptions = {
      weekday: undefined,
      year: 'numeric',
      month: 'long',
      day: undefined,
    };

    text = props.row.dt?.toLocaleDateString(undefined, options);
  } else {
    className = "DayHeaderRow";
    text = props.row.dt?.toLocaleDateString();
  }

  return (
    <div style={props.style} className={className}>
      <div>{text}</div>
      <img
        className="HeaderRow-Check"
        width={20}
        height={20}
        src={(selected) ? './assets/checkbox-check.svg' : './assets/checkbox-unchecked.svg'}
        onClick={handleSelect}
      />
    </div>
  );
}
