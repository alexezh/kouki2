import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import { updateAppState } from "./AppState";
import { useEffect, useState } from "react";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import { PhotoCollection } from "../photo/CollectionStore";

// catelog is either collection, or list of collections (like folder)
export function CollectionItemLayout(props: { textClassName: string, text: string, coll: PhotoCollection, paddingLeft: number }) {
  const [count, setCount] = useState(props.coll.totalPhotos);

  useEffect(() => {
    let collId = props.coll.addOnChanged(() => {
      setCount(props.coll.totalPhotos);
    });

    return () => {
      props.coll.removeOnChanged(collId);
    }
  }, [props.coll.id]);

  function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    updateAppState({ navListId: props.coll.id });
  }

  return (
    <ListItemButton sx={{ pl: props.paddingLeft }} onClick={handleClick} key={'coll_' + props.coll.id.toString()}>
      <div className={props.textClassName}>
        <div>{props.text}</div>
        <div className={props.textClassName + "-count"}>{count}</div>
      </div>
    </ListItemButton>);
}

/**
 * list of CollectionItemLayout
 * navigates to top element 
 */
export function CollectionListLayout(props: { text: string, textClassName: string, lists: PhotoCollection[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <ListItemButton onClick={() => {
        // load first element
        if (props.lists.length > 0) {
          updateAppState({ navListId: props.lists[0].id });
        }
      }} >
        <div className={props.textClassName}>{props.text}</div>
        {open ? <ExpandLess onClick={() => setOpen(!open)} /> : <ExpandMore onClick={() => setOpen(!open)} />}
      </ListItemButton >
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {props.lists.map((x) => {
            return (
              <CollectionItemLayout
                paddingLeft={4}
                key={'list_' + x.id}
                textClassName="Catalog-item"
                text={x.createDt.toLocaleDateString()}
                coll={x} />)
          })}
        </List>
      </Collapse>
    </div >
  );
}
