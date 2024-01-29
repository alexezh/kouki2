import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider/Divider";
import { AlbumPhoto, AlbumRow, FolderId, PhotoListId } from "../photo/AlbumPhoto";
import { PhotoInfo } from "./PhotoInfo";
import { PhotoFolder, addOnFoldersChanged, getFolderList, getFolders, loadFolders, removeOnFoldersChanged } from "../photo/FolderStore";
import { updateAppState } from "./AppState";
import { Device, addOnDeviceChanged, getDevices, loadDevices, removeOnDeviceChanged } from "../photo/Device";
import { addOnCollectionsChanged, getCollectionsByKind, getQuickCollection } from "../photo/CollectionStore";
import { loadPhotoList } from "../photo/LoadPhotoList";
import { CollectionItemLayout, CollectionListLayout } from "./CollectionItemLayout";

type SetPhotoHandler = React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;

function onDevice() {
  //setView(new ViewDesc(CanvasViewKind.Device));
}

function onAlbum(setPhoto: SetPhotoHandler) {
  //setView(new ViewDesc(CanvasViewKind.Album));
}

export function collapsableList(
  text: string,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  items: JSX.Element[]) {
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

function FolderLayout(props: { folder: PhotoFolder }) {
  const [count, setCount] = useState(0);
  const [openFolders, setOpenFolders] = useState(false);

  useEffect(() => {
    if (!props.folder.wire) {
      return;
    }

    let list = getFolderList(new PhotoListId('folder', props.folder.wire!.id));
    setCount(list.photoCount);
    let collId = list.addOnChanged(() => {
      setCount(list.photoCount);
    });

    return () => {
      list.removeOnChanged(collId);
    }
  }, [props.folder]);

  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    //props.setPhotos(photos);
    updateAppState({ navListId: new PhotoListId('folder', props.folder.wire!.id as FolderId) });
  }

  if (props.folder.children.length > 0) {
    return (
      <div>
        <ListItemButton onClick={() => setOpenFolders(!openFolders)} key={'cat_' + props.folder.path} >
          <div className="FolderItem">{props.folder.relname}</div>
          {openFolders ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton >
        <Collapse in={openFolders} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {props.folder.children.map((x) => { return (<FolderLayout folder={x} />) })}
          </List>
        </Collapse>
      </div>)
  } else {
    return (
      <ListItemButton className="FolderItem" sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.wire!.id}>
        <div className="FolderItem">
          <div>
            {props.folder.relname}
          </div>
          <div className="FolderItem-Count">
            {count}
          </div>
        </div>
      </ListItemButton>);
  }
}


let catalogs: { name: string, id: PhotoListId }[] =
  [
    { name: 'Quick collection', id: new PhotoListId('quick', 0) },
    { name: 'All Photos', id: new PhotoListId('all', 0) },
    { name: 'Import', id: new PhotoListId('import', 0) },
    { name: 'Export', id: new PhotoListId('export', 0) },
  ];

function renderCatalogs(): JSX.Element[] {
  let items: JSX.Element[] = [];

  items.push((<CollectionItemLayout text={"Quich collection"} id={new PhotoListId('quick', 0)} />))
  items.push((<CollectionItemLayout text={"All Photos"} id={new PhotoListId('all', 0)} />))
  items.push((<CollectionListLayout text="Export" lists={getCollectionsByKind('export')} />))
  //catalogs.map((x) => { return () });

  return items;
}

function DeviceLayout(props: { device: Device }) {
  return (
    <ListItemButton sx={{ pl: 4 }} key={'device_' + props.device.wire.id}>
      <div className="CatalogItem">
        <div>{props.device.name}</div>
      </div>
      <List component="div" disablePadding>
        <FolderLayout folder={props.device.archiveFolder} />
      </List>
    </ListItemButton>);
}

//export function NavigationBar() {
//  return (
export function NavigationBar() {
  let [openCollections, setOpenCollections] = useState(true);
  let [openFolders, setOpenFolders] = useState(false);
  let [openDevices, setOpenDevices] = useState(false);
  let [openInfo, setOpenInfo] = useState(true);

  const [folders, setFolders] = useState([] as PhotoFolder[]);
  const [devices, setDevices] = useState([] as Device[]);
  useEffect(() => {
    // reload folder list when folders change
    let idFolders = addOnFoldersChanged(() => {
      setFolders(getFolders());
    });

    let idCollections = addOnCollectionsChanged(() => {
      setFolders(getFolders());
    });

    // reload folder list when folders change
    let idDevives = addOnDeviceChanged(() => {
      setDevices(getDevices());
    });

    // initially, open "All collection"
    setFolders(getFolders());
    setDevices(getDevices());
    updateAppState({ navListId: new PhotoListId('all', 0) });

    return () => {
      removeOnFoldersChanged(idFolders);
      removeOnFoldersChanged(idCollections);
      removeOnDeviceChanged(idDevives);
    };
  }, []);

  // TODO: add by month navigation in photo-all.

  return (
    <div>
      {collapsableList("Catalogs", openCollections, setOpenCollections, renderCatalogs())}
      <Divider />
      {collapsableList("Folders", openFolders, setOpenFolders,
        folders.map((x) => { return (<FolderLayout folder={x} />) }))}
      <Divider />
      {collapsableList("Devices", openDevices, setOpenDevices,
        devices.map((x) => { return (<DeviceLayout device={x} />) }))}
      <Divider />
      {collapsablePane("Photo Info", openInfo, setOpenInfo,
        () => (<PhotoInfo />))
      }
    </div>);
}
