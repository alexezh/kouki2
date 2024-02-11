import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import Divider from "@mui/material/Divider/Divider";
import { getAppState, updateAppState } from "../AppState";
import { MouseEventHandler, useState } from "react";
import ListItemIcon from "@mui/material/ListItemIcon/ListItemIcon";
import Check from '@mui/icons-material/Check';
import ListItemText from "@mui/material/ListItemText/ListItemText";
import MenuItem from "@mui/material/MenuItem/MenuItem";
import { FilterFavorite } from "../../photo/PhotoList";

function MenuItemCheck(props: { checked: boolean, text: string, onClick: MouseEventHandler<HTMLElement> }) {
  return props.checked ?
    (<MenuItem onClick={props.onClick}>
      <ListItemIcon>
        <Check />
      </ListItemIcon>
      {props.text}
    </MenuItem>) :
    (<MenuItem onClick={props.onClick}>
      <ListItemText inset>{props.text}</ListItemText>
    </MenuItem>);
}

export function FilterMenu(props: CommandMenuProps) {
  const [filterFav, setFilterFav] = useState(getAppState().filterFavorite);
  const [filterDups, setFilterDups] = useState(getAppState().filterDups);

  function onFilterFav(value: FilterFavorite) {
    setFilterFav(value);
    updateAppState({ filterFavorite: value })
    props.onMenuClose();
  };

  function onFilterDups() {
    let value = !filterDups;
    setFilterDups(value);
    updateAppState({ filterDups: value })
    props.onMenuClose();
  };

  return (
    <CommandMenu {...props} >
      <MenuItemCheck checked={filterFav === 'all'} text='All' onClick={() => onFilterFav('all')} />
      <MenuItemCheck checked={filterFav === 'favorite'} text='Favorite' onClick={() => onFilterFav('favorite')} />
      <MenuItemCheck checked={filterFav === 'rejected'} text='Rejected' onClick={() => onFilterFav('rejected')} />
      <Divider />
      <MenuItemCheck checked={filterDups} text='Duplicates' onClick={() => onFilterDups()} />
    </CommandMenu >
  )
}