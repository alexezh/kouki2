import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import { useEffect, useState } from "react";
import { YearEntry, addOnStateChanged, getAppState, removeOnStateChanged } from "./AppState";
import { Command, scrollAlbumToDate } from "./Commands";
import { getStartDt, loadLibrary } from "../photo/PhotoStore";
import { substractYears } from "../lib/date";

const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let expandIncrement = 3;

function CalendarBarYear(props: {
  year: YearEntry,
  isOpen: boolean,
  onSelect: (year: YearEntry, month: number) => void
}) {
  const [open, setOpen] = useState(props.isOpen);

  function handleClick() {
    if (!props.year.lessThen) {
      setOpen(!open);
    }
    props.onSelect(props.year, (props.year.months.length > 0) ? props.year.months[0] : 0);
  }

  function handleMonthClick(month: number) {
    props.onSelect(props.year, month);
  }

  return (
    <div key={'year_' + props.year.year}>
      <div className="Calendar-bar-year" onClick={handleClick}>{(props.year.lessThen) ? "<" + props.year.year : props.year.year}</div>
      {!props.year.lessThen ?
        (<Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {
              props.year.months.map((x: number) => (<div
                key={"month_" + x.toString()}
                className="Calendar-bar-month"
                onClick={() => handleMonthClick(x)}>{monthName[x]}</div>))
            }
          </List>
        </Collapse>) : null
      }
    </div>
  )
}

export function CalendarBar(props: { className: string }) {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [openedYear, setOpenedYear] = useState<YearEntry | null>(null)
  useEffect(() => {
    let id = addOnStateChanged(() => {
      setYears(getAppState().years);
    });
    return () => {
      removeOnStateChanged(id);
    }
  }, [])

  function handleSelect(year: YearEntry, month: number) {
    if (year.lessThen) {
      let startDt = getStartDt();
      if (startDt) {
        // ignore the fact that call is async
        loadLibrary({ startDt: substractYears(startDt, expandIncrement) });
        expandIncrement *= 2;
      }
    } else {
      if (openedYear !== year) {
        setOpenedYear(year);
      }
      scrollAlbumToDate({ year: year.year, month: month })
    }
  }

  return (
    <div className={props.className}>
      <div className="Calendar-bar-area">
        <List component="div" disablePadding>
          {
            years.map((year: YearEntry) => (<CalendarBarYear key={"year_" + year.toString()}
              year={year}
              isOpen={openedYear?.year === year.year} onSelect={handleSelect} />))
          }
        </List>
      </div>
    </div>
  );
}
