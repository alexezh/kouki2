import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import { useEffect, useState } from "react";
import { YearEntry, addOnStateChanged, getAppState, removeOnStateChanged } from "./AppState";
import { Command, invokeCommand, scrollAlbumToDate } from "./Commands";

const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    <div key={'year_' + props.year.year}>
      <div className="Calendar-bar-year" onClick={handleClick}>{props.year.year}</div>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {
            props.year.months.map((x: number) => (<div
              key={"month_" + x.toString()}
              className="Calendar-bar-month"
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
    console.log("CalendarBar: useEffect");
    let id = addOnStateChanged(() => {
      setYears(getAppState().years);
    });
    return () => {
      removeOnStateChanged(id);
    }
  }, [])

  function handleSelect(year: number, month: number) {
    if (openedYear !== year) {
      setOpenedYear(year);
    }
    scrollAlbumToDate({ year: year, month: month })
  }

  return (
    <div className={props.className}>
      <div className="Calendar-bar-area">
        <List component="div" disablePadding>
          {
            years.map((year: YearEntry) => (<CalendarBarYear key={"year_" + year.year.toString()} year={year} isOpen={openedYear === year.year} onSelect={handleSelect} />))
          }
        </List>
      </div>
    </div>
  );
}
