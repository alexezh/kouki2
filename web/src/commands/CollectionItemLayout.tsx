import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import { updateAppState } from "./AppState";
import { useEffect, useState } from "react";
import { PhotoListId } from "../photo/AlbumPhoto";
import { loadPhotoList } from "../photo/LoadPhotoList";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import { PhotoCollection } from "../photo/CollectionStore";

// catelog is either collection, or list of collections (like folder)
export function CollectionItemLayout(props: { text: string, id: PhotoListId, paddingLeft: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (props.id.kind === 'quick') {
      console.log('load quick coll ' + props.id.id);
    }
    let list = loadPhotoList(props.id);
    setCount(list.photoCount);
    let collId = list.addOnListChanged(() => {
      setCount(list!.photoCount);
    });

    return () => {
      if (collId > 0) {
        list!.removeOnListChanged(collId);
      }
    }
  }, [props.id.id]);

  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    updateAppState({ navListId: props.id });
  }

  return (
    <ListItemButton sx={{ pl: props.paddingLeft }} onClick={handleClick} key={'coll_' + props.id}>
      <div className="CatalogItem">
        <div>{props.text}</div>
        <div className="CatalogItem-Count">{count}</div>
      </div>
    </ListItemButton>);
}

export function CollectionListLayout(props: { text: string, lists: PhotoCollection[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <ListItemButton onClick={() => setOpen(!open)} >
        <div className="FolderItem">{props.text}</div>
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton >
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {props.lists.map((x) => { return (<CollectionItemLayout paddingLeft={4} key={'list_' + x.id} text={x.createDt.toLocaleDateString()} id={x.id} />) })}
        </List>
      </Collapse>
    </div>
  );
}
