import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, AlbumRow } from "./PhotoStore";
import { PhotoLayout } from "./PhotoLayout";

type PhotoRowLayoutProps = {
  style: CSSProperties,
  row: AlbumRow,
  onClick: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void,
  onSelected: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void
}
export function PhotoRowLayout(props: PhotoRowLayoutProps) {
  function renderRow(row: AlbumRow) {
    let res = [];
    return row.photos!.map((photo: AlbumPhoto, index: number) => {
      return (<PhotoLayout photo={photo} onClick={props.onClick} onSelected={props.onSelected} selected={false} margin={0} key={'photo_' + index}></PhotoLayout>)
    });
  }

  let style: CSSProperties = { ...props.style, height: props.row.height };
  if (props.row.height === 34) {
    console.log("hello");
  }
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
