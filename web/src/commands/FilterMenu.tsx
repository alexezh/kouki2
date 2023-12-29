import RadioGroup from "@mui/material/RadioGroup/RadioGroup";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import FormControlLabel from "@mui/material/FormControlLabel/FormControlLabel";
import Divider from "@mui/material/Divider/Divider";
import { FilterFavorite, getState, updateState } from "./AppState";
import { useState } from "react";
import Radio from "@mui/material/Radio/Radio";

export function FilterMenu(props: CommandMenuProps) {
  const [filter, setFilter] = useState(getState().filterFavorite);

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