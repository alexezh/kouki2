import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider/Divider";
import { AlbumPhoto, CatalogId, FolderId, loadCollection, loadFolder, loadFolders } from "../photo/PhotoStore";
import { WireFolder } from "../lib/fetchadapter";
import { Typography } from "@mui/material";
import { PhotoInfo } from "./PhotoInfo";
import { addOnFoldersChanged, addOnListChanged, removeOnFoldersChanged, setCurrentList } from "./NavigationState";

type SetPhotoHandler = React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;

function onDevice() {
  //setView(new ViewDesc(CanvasViewKind.Device));
}

function onAlbum(setPhoto: SetPhotoHandler) {
  //setView(new ViewDesc(CanvasViewKind.Album));
}

let catalogs: { name: string, id: CatalogId }[] =
  [
    { name: 'Quick collection', id: 'quick' },
    { name: 'All Photos', id: 'all' },
    { name: 'Starred', id: 'starred' },
    { name: 'Dups', id: 'dups' },
  ];

export function collapsableList(text: string, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, items: any) {
  return [(
    <ListItemButton onClick={() => setOpen(!open)} key={'cat_' + text} >
      <ListItemText primary={text} />
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton >),
  (<Collapse in={open} timeout="auto" unmountOnExit>
    <List component="div" disablePadding>
      {items}
    </List>
  </Collapse>)]
}

export function collapsablePane(
  text: string,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  renderPane: () => JSX.Element) {

  return [(
    <ListItemButton onClick={() => setOpen(!open)} key={'cat_' + text}>
      <ListItemText primary={text} />
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton>),
  (<Collapse in={open} timeout="auto" unmountOnExit>
    {renderPane()}
  </Collapse>)]
}

function FolderItem(props: { folder: WireFolder }) {
  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    let photos = await loadFolder(props.folder.id);
    //props.setPhotos(photos);
    setCurrentList(props.folder.id as FolderId, photos);
  }

  return (
    <ListItemButton className="FolderItem" sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.id}>
      <Typography noWrap>{props.folder.path}</Typography>
    </ListItemButton>);
}

function CollectionItem(props: { text: string, id: CatalogId }) {
  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    let photos = await loadCollection(props.id);
    setCurrentList(props.id, photos);
  }

  return (
    <ListItemButton sx={{ pl: 4 }} onClick={handleClick} key={'coll_' + props.id}>
      <Typography noWrap>{props.text}</Typography>
    </ListItemButton>);
}
//export function NavigationBar() {
//  return (
export function NavigationBar() {
  let [openCollections, setOpenCollections] = useState(true);
  let [openFolders, setOpenFolders] = useState(false);
  let [openInfo, setOpenInfo] = useState(true);

  const [folders, setFolders] = useState([] as WireFolder[]);
  useEffect(() => {
    // reload folder list when folders change
    let idFolders = addOnFoldersChanged(async () => {
      let folders = await loadFolders();
      setFolders(folders);
    });

    // initially, open "All collection"
    setTimeout(async () => {
      let folders = await loadFolders();
      setFolders(folders);

      let photos = await loadCollection('all');
      setCurrentList('all', photos)
    });
    return () => {
      removeOnFoldersChanged(idFolders);
    };
  }, []);

  // TODO: add by month navigation in photo-all.

  return (
    <div>
      {collapsableList("Catalogs", openCollections, setOpenCollections,
        catalogs.map((x) => { return (<CollectionItem text={x.name} id={x.id} />) }))}
      <Divider />
      {collapsableList("Folders", openFolders, setOpenFolders,
        folders.map((x) => { return (<FolderItem folder={x} />) }))}
      <Divider />
      {collapsablePane("Photo Info", openInfo, setOpenInfo,
        () => (<PhotoInfo />))
      }
    </div>);
}
