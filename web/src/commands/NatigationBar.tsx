import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { PropsWithChildren, useEffect, useState } from "react";
import Divider from "@mui/material/Divider/Divider";
import { AlbumPhoto, PhotoListId } from "../photo/AlbumPhoto";
import { PhotoInfo } from "./PhotoInfo";
import { PhotoFolder, addOnFoldersChanged, getFolder, getFolderList, getFolders, removeOnFoldersChanged } from "../photo/FolderStore";
import { updateAppState } from "./AppState";
import { Device, addOnDeviceChanged, getDevices, removeOnDeviceChanged } from "../photo/Device";
import { CollectionId, addOnCollectionsChanged, collectionMap, getCollectionByKind, getCollectionsByKind } from "../photo/CollectionStore";
import { CollectionItemLayout, CollectionListLayout } from "./CollectionItemLayout";

export function CollapsableList(props: {
  open: boolean,
  text: string,
  items: JSX.Element[]
}) {
  let [open, setOpen] = useState(props.open);

  return (
    <div>
      <ListItemButton onClick={() => setOpen(!open)} >
        <ListItemText primary={props.text} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton >
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {props.items}
        </List>
      </Collapse>
    </div>)
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
  const [count, setCount] = useState(props.folder.totalPhotos);
  const [openFolders, setOpenFolders] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    //props.setPhotos(photos);
    updateAppState({ navListId: props.folder.id });
  }

  if (props.folder.children.length > 0) {
    return (
      <div>
        <ListItemButton onClick={() => setOpenFolders(!openFolders)} key={'cat_' + props.folder.path} >
          <div className="Folder-item">{props.folder.relname}</div>
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
      <ListItemButton className="Folder-item" sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.id}>
        <div className="Folder-item">
          <div>
            {props.folder.relname}
          </div>
          <div className="Folder-item-count">
            {count}
          </div>
        </div>
      </ListItemButton>);
  }
}

const maxCollectionHistory = 10;

function renderCatalogs(): JSX.Element[] {
  let items: JSX.Element[] = [];

  // items.push((<CollectionListLayout key='quick' text="Quich collection"
  //   lists={getCollectionsByKind('quick', maxCollectionHistory)} />))
  // items.push((
  //   <CollectionItemLayout paddingLeft={2} key='recent' text="All Photos"
  //     id={new PhotoListId('all', 0 as CollectionId)} />))
  // items.push((
  //   <CollectionItemLayout paddingLeft={2} key='favorite' textClassName="Catalog-item" text="Favorite"
  //     id={new PhotoListId('all', 0 as CollectionId)} />))
  items.push((
    <CollectionItemLayout paddingLeft={2} key='rejected' textClassName="Catalog-item" text="Rejected"
      coll={getCollectionByKind('rejected')} />))
  items.push((
    <CollectionListLayout key='export' textClassName="Folder-item" text="Export"
      lists={getCollectionsByKind('export', maxCollectionHistory)} />))
  items.push((
    <CollectionListLayout key='import' textClassName="Folder-item" text="Import"
      lists={getCollectionsByKind('import', maxCollectionHistory)} />))
  items.push((
    <CollectionItemLayout paddingLeft={2} key='hidden' textClassName="Catalog-item" text="Hidden"
      coll={getCollectionByKind('hidden')} />))
  items.push((
    <CollectionItemLayout paddingLeft={2} key='dups' textClassName="Catalog-item" text="Duplicates"
      coll={getCollectionByKind('all')} />))
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
  let [openInfo, setOpenInfo] = useState(true);
  const [folders, setFolders] = useState([] as PhotoFolder[]);
  const [devices, setDevices] = useState([] as Device[]);
  const [loaded, setLoaded] = useState(collectionMap.size > 0);

  useEffect(() => {
    // reload folder list when folders change
    let idFolders = addOnFoldersChanged(() => {
      setFolders(getFolders());
    });

    let idCollections = addOnCollectionsChanged(() => {
      setFolders(getFolders());
      setLoaded(true);
    });

    // reload folder list when folders change
    let idDevives = addOnDeviceChanged(() => {
      setDevices(getDevices());
    });

    // initially, open "All collection"
    setFolders(getFolders());
    setDevices(getDevices());
    updateAppState({ navListId: new PhotoListId('all', 0 as CollectionId) });

    return () => {
      removeOnFoldersChanged(idFolders);
      removeOnFoldersChanged(idCollections);
      removeOnDeviceChanged(idDevives);
    };
  }, []);

  // TODO: add by month navigation in photo-all.

  return (loaded) ? (
    <div>
      <CollectionListLayout key='quick' textClassName="Top-catalog-item" text="Quich collection"
        lists={getCollectionsByKind('quick', maxCollectionHistory)} />
      <CollectionItemLayout paddingLeft={2} key='recent' textClassName="Top-catalog-item" text="All Photos"
        coll={getCollectionByKind('all')} />
      <CollectionItemLayout paddingLeft={2} key='favorite' textClassName="Top-catalog-item" text="Favorite"
        coll={getCollectionByKind('favorite')} />
      <CollapsableList key="catalogs" text="Catalogs" open={true}
        items={renderCatalogs()} />
      <Divider />
      <CollapsableList key="folders" text="Folders" open={false}
        items={folders.map((x) => { return (<FolderLayout folder={x} />) })} />

      <Divider />
      {
        collapsablePane("Photo Info", openInfo, setOpenInfo,
          () => (<PhotoInfo />))
      }
    </div >) : null;
  //      <CollapsableList key="devices" text="Devices" open={false} items={devices.map((x) => { return (<DeviceLayout device={x} />) })} />
}
