import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import Button from '@mui/material/Button/Button';
import { AlbumPhoto } from '../photo/AlbumPhoto';
import { Dispatch, PropsWithChildren, useState } from 'react';
import Menu from '@mui/material/Menu/Menu';
import MenuItem from '@mui/material/MenuItem/MenuItem';
import Box from '@mui/material/Box/Box';
import { selectionManager } from './SelectionManager';
import { AddFolderDialog, RescanFolderDialog } from './AddFolderDialog';
import { DatePicker } from '@mui/x-date-pickers';
import Checkbox from '@mui/material/Checkbox/Checkbox';
import { FilterFavorite, getState, updateState } from './AppState';
import Divider from '@mui/material/Divider/Divider';
import FormControlLabel from '@mui/material/FormControlLabel/FormControlLabel';
import Radio from '@mui/material/Radio/Radio';
import RadioGroup from '@mui/material/RadioGroup/RadioGroup';
import React from 'react';
import { all } from 'underscore';
import { ExportSelectionDialog } from './ExportSelectionDialog';

type CommandMenuProps = PropsWithChildren<{
  open: boolean,
  anchorEl: HTMLElement | null,
  label: string,
  id: string,
  onMenuClick: (id: string, event: React.MouseEvent<HTMLElement>) => void,
  onMenuClose: () => void,
  extra?: () => JSX.Element
}>;

export function CommandMenu(props: CommandMenuProps) {
  return (
    <Box sx={{ flexGrow: 0 }}>
      <Button
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          props.onMenuClick(props.id, event);
        }}
        sx={{ p: 0 }}>{props.label}
      </Button>
      <Menu
        id={props.id}
        sx={{ mt: '0px' }}
        anchorEl={props.anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        open={props.open}
        onClose={props.onMenuClose}
      >
        {props.children}
      </Menu>
      {props.extra ? props.extra() : null}
    </Box>
  )
}

export function FilterMenu(props: CommandMenuProps) {
  const [filter, setFilter] = React.useState(getState().filterFavorite);

  function filterChanged(event: React.ChangeEvent<HTMLInputElement>) {
    let value = (event.target as HTMLInputElement).value as FilterFavorite;
    setFilter(value);
    updateState({ filterFavorite: value })
    props.onMenuClose();
  };

  return (
    <CommandMenu {...props} >
      <RadioGroup value={filter} onChange={filterChanged}>
        <FormControlLabel control={<Radio />} label="All" value="all" />
        <FormControlLabel control={<Radio />} label="Favorite" value="favorite" />
        <FormControlLabel control={<Radio />} label="Rejected" value="rejected" />
      </RadioGroup>
      <Divider />
    </CommandMenu>
  )
}

export function SelectMenu(props: CommandMenuProps & { photos: AlbumPhoto[] }) {
  const [openExport, setExport] = useState(false);

  function handleSelectAll() {
    selectionManager.add(props.photos);
    props.onMenuClose();
  }

  function handleSelectNone() {
    selectionManager.remove(props.photos);
    props.onMenuClose();
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
    props.onMenuClose();
  }

  function handleExportSelection() {
    props.onMenuClose();
  }

  function renderDialogs() {
    return (<div>
      {
        (openExport) ? (<ExportSelectionDialog onClose={() => setExport(false)} />) : null
      }
    </div>)
  }

  return (
    <CommandMenu {...props} extra={renderDialogs}>
      <MenuItem key="edit_all" onClick={handleSelectAll}>Select All</MenuItem>
      <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
      <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
      <Divider />
      <MenuItem key="export_selection" onClick={handleExportSelection}>Export Selection</MenuItem>
    </CommandMenu>
  )
}
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
    </CommandMenu>
  )
}
export function CommandBar(props: { className?: string, photos: AlbumPhoto[] }) {
  const [anchorEl, setAnchorEl] = useState<null | { elem: HTMLElement, id: string }>(null);

  function handleMenuClick(id: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl({ elem: event.currentTarget, id: id });
  }

  function closeMenu() {
    if (anchorEl) {
      setAnchorEl(null);
    }
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <SelectMenu open={anchorEl?.id === "edit"} anchorEl={anchorEl?.elem ?? null} photos={props.photos} label="Edit" id="edit" onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <LibraryMenu open={anchorEl?.id === "library"} anchorEl={anchorEl?.elem ?? null} label='Library' id='library' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <FilterMenu open={anchorEl?.id === "filter"} anchorEl={anchorEl?.elem ?? null} label='Filter' id='filter' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
      </Toolbar>
    </AppBar >)
};

{/* 
            <MenuItem key="lib_star1" onClick={handleRescanFolder}>Rescan Folder</MenuItem>
            <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>

<Divider />
<DatePicker
  label=""
  views={['year', 'month', 'day']}
  slotProps={{ textField: { size: 'small' } }} /> */}
