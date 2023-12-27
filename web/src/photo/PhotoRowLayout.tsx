import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, AlbumRow } from "./AlbumPhoto";
import { PhotoLayout } from "./PhotoLayout";
import { selectionManager } from "../commands/SelectionManager";

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
        photo={photo}
        onClick={props.onClick}
        onSelected={props.onSelected}
        selected={selectionManager.isSelected(photo)}
        padding={props.row.padding}
        left={left}
        key={'photo_' + index}></PhotoLayout>));

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

type DeyRowLayoutProps = {
  style?: CSSProperties,
  dt: Date,
  selected?: boolean,
  onSelected?: (val: boolean, dt: Date) => void
}
export function DayRowLayout(props: DeyRowLayoutProps) {
  let [selected, setSelected] = useState<boolean>(props.selected ?? false);
  function handleSelect() {
    let val = !selected;
    setSelected(val);
    if (props.onSelected) {
      props.onSelected(val, props.dt);
    }
  }
  return (
    <div style={props.style} className="HeaderRow">
      <div>
        {props.dt?.toLocaleDateString()}
      </div>
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