import RadioGroup from "@mui/material/RadioGroup/RadioGroup";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import FormControlLabel from "@mui/material/FormControlLabel/FormControlLabel";
import Divider from "@mui/material/Divider/Divider";
import { FilterFavorite, getAppState, updateState } from "../AppState";
import { useState } from "react";
import Radio from "@mui/material/Radio/Radio";
import Checkbox from "@mui/material/Checkbox/Checkbox";

export function FilterMenu(props: CommandMenuProps) {
  const [filterFav, setFilterFav] = useState(getAppState().filterFavorite);
  const [filterDups, setFilterDups] = useState(getAppState().filterDups);

  function filterFavChanged(event: React.ChangeEvent<HTMLInputElement>) {
    let value = (event.target as HTMLInputElement).value as FilterFavorite;
    setFilterFav(value);
    updateState({ filterFavorite: value })
    props.onMenuClose();
  };

  function filterDupsChanged(event: React.ChangeEvent<HTMLInputElement>) {
    let value = (event.target as HTMLInputElement).checked;
    setFilterDups(value);
    updateState({ filterDups: value })
    props.onMenuClose();
  };

  return (
    <CommandMenu {...props} >
      <RadioGroup value={filterFav} onChange={filterFavChanged}>
        <FormControlLabel control={<Radio />} label="All" value="all" />
        <FormControlLabel control={<Radio />} label="Favorite" value="favorite" />
        <FormControlLabel control={<Radio />} label="Rejected" value="rejected" />
      </RadioGroup>
      <Divider />
      <FormControlLabel control={<Checkbox checked={filterDups} onChange={filterDupsChanged} />} label="Duplicate" />
    </CommandMenu>
  )
}