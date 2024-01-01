import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import { useEffect, useState } from "react";
import { YearEntry, addOnStateChanged, getState, removeOnStateChanged, scrollAlbumToDate } from "./AppState";

const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Sep', 'Oct', 'Nov', 'Dec'];

function CalendarBarYear(props: {
  year: YearEntry,
  isOpen: boolean,
  onSelect: (year: number, month: number) => void
}) {
  const [open, setOpen] = useState(props.isOpen);

  function handleClick() {
    setOpen(!open);
    props.onSelect(props.year.year, 0);
  }

  function handleMonthClick(month: number) {
    props.onSelect(props.year.year, month);
  }

  return (
    <div>
      <div className="CalendarBarYear" onClick={handleClick}>{props.year.year}</div>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {
            props.year.months.map((x: number) => (<div
              className="CalendarBarMonth"
              onClick={() => handleMonthClick(x)}>{monthName[x]}</div>))
          }
        </List>
      </Collapse>
    </div>
  )
}

export function CalendarBar(props: { className: string }) {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [openedYear, setOpenedYear] = useState<number | null>(null)
  useEffect(() => {
    let id = addOnStateChanged(() => {
      setYears(getState().years);
    });
    return () => {
      removeOnStateChanged(id);
    }
  })

  function handleSelect(year: number, month: number) {
    if (openedYear !== year) {
      setOpenedYear(year);
    }
    scrollAlbumToDate(new Date(year, month))
  }

  return (
    <List className={props.className} component="div" disablePadding>
      {
        years.map((year: YearEntry) => (<CalendarBarYear year={year} isOpen={openedYear === year.year} onSelect={handleSelect} />))
      }
    </List>
  );
}
