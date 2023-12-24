import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import Button from '@mui/material/Button/Button';
import { AlbumPhoto } from '../photo/AlbumPhoto';
import { useState } from 'react';
import Menu from '@mui/material/Menu/Menu';
import MenuItem from '@mui/material/MenuItem/MenuItem';
import Box from '@mui/material/Box/Box';
import { selectionManager } from './SelectionManager';
import { AddFolderDialog, RescanFolderDialog } from './AddFolderDialog';
import { DatePicker } from '@mui/x-date-pickers';
import { Divider } from '@mui/material';
import { getState } from './AppState';

export function CommandBar(props: { className?: string, photos: AlbumPhoto[] }) {
  const [anchorElEdit, setAnchorElEdit] = useState<null | HTMLElement>(null);
  const [anchorElLibrary, setAnchorElLibrary] = useState<null | HTMLElement>(null);
  const [openAddFolder, setOpenAddFolder] = useState(false);
  const [openRescanFolder, setOpenRescanFolder] = useState(false);

  const handleOpenEditMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElEdit(event.currentTarget);
  };

  function handleCloseEditMenu() {
    setAnchorElEdit(null);
  }

  function handleSelectAll() {
    selectionManager.add(props.photos);
    handleCloseEditMenu();
  }

  function handleSelectNone() {
    selectionManager.remove(props.photos);
    handleCloseEditMenu();
  }

  function handleInvertSelect() {
    let select: AlbumPhoto[] = [];
    for (let x of props.photos) {
      if (!selectionManager.items.get(x.wire.hash)) {
        select.push(x);
      }
    }
    selectionManager.clear();
    selectionManager.add(select);
    handleCloseEditMenu();
  }

  const handleOpenLibraryMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElLibrary(event.currentTarget);
  };

  const handleCloseLibraryMenu = () => {
    setAnchorElLibrary(null);
  }

  function handleAddFolder() {
    handleCloseLibraryMenu();
    setOpenAddFolder(true);
  }

  function handleRescanFolder() {
    handleCloseLibraryMenu();
    let listId = getState().currentListId;
    if (typeof listId === "number") {
      setOpenRescanFolder(true);
    }
  }

  function handleNewCollection() {
    handleCloseLibraryMenu();
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <Box sx={{ flexGrow: 0 }}>
          <Button onClick={handleOpenEditMenu} sx={{ p: 0 }}>Edit</Button>
          <Menu
            id="menu-edit"
            sx={{ mt: '0px' }}
            anchorEl={anchorElEdit}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElEdit)}
            onClose={handleCloseEditMenu}
          >
            <MenuItem key="edit_all" onClick={handleSelectAll}>Select All</MenuItem>
            <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
            <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
          </Menu>
        </Box>
        <Box sx={{ flexGrow: 0 }}>
          <Button onClick={handleOpenLibraryMenu} sx={{ p: 0 }}>Library</Button>
          <Menu
            id="menu-library"
            sx={{ mt: '0px' }}
            anchorEl={anchorElLibrary}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElLibrary)}
            onClose={handleCloseLibraryMenu}
          >
            <MenuItem key="lib_addfolder" onClick={handleAddFolder}>Add Folder</MenuItem>
            <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Rescan Folder</MenuItem>
            <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>
          </Menu>
          {
            (openAddFolder) ? (<AddFolderDialog onClose={() => setOpenAddFolder(false)} />) : null
          }
          {
            (openRescanFolder) ? (<RescanFolderDialog onClose={() => setOpenRescanFolder(false)} folderId={getState().currentListId as number} />) : null
          }

        </Box>
      </Toolbar>
    </AppBar>)
};

{/* <Divider />
<DatePicker
  label=""
  views={['year', 'month', 'day']}
  slotProps={{ textField: { size: 'small' } }} /> */}
