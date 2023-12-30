import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import { AddFolderDialog, RescanFolderDialog } from "./AddFolderDialog";
import { getState } from "./AppState";
import { useState } from "react";
import { wireAddDevice } from "../lib/mobileclient";
import { catchAll } from "../lib/error";

export function LibraryMenu(props: CommandMenuProps) {
  const [openAddFolder, setOpenAddFolder] = useState(false);
  const [openRescanFolder, setOpenRescanFolder] = useState(false);

  function renderDialogs() {
    return (<div>
      {
        (openAddFolder) ? (<AddFolderDialog onClose={() => setOpenAddFolder(false)} />) : null
      }
      {
        (openRescanFolder) ? (<RescanFolderDialog onClose={() => setOpenRescanFolder(false)} folderId={getState().currentListId as number} />) : null
      }
    </div>)
  }

  function handleAddFolder() {
    props.onMenuClose();
    setOpenAddFolder(true);
  }

  async function handleAddDevice() {
    props.onMenuClose();
    catchAll(() => wireAddDevice("Ezh14"));
  }

  function handleRescanFolder() {
    props.onMenuClose();
    let listId = getState().currentListId;
    if (typeof listId === "number") {
      setOpenRescanFolder(true);
    }
  }

  function handleNewCollection() {
    props.onMenuClose();
  }

  return (
    <CommandMenu {...props} extra={renderDialogs}>
      <MenuItem key="lib_addfolder" onClick={handleAddFolder}>Add Folder</MenuItem>
      <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Rescan Folder</MenuItem>
      <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>
      <MenuItem key="add_device" onClick={handleAddDevice}>Add Device</MenuItem>
    </CommandMenu>
  )
}