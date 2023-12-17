import { CSSProperties, PropsWithChildren, useLayoutEffect, useRef } from "react"

export function Measure(props: PropsWithChildren<{
  onMeasured: (width: number, height: number) => void
}>) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    // @ts-ignore
    props.onMeasured(ref.current.offsetWidth, ref.current.offsetHeight);
  }, [ref.current]);

  let style: CSSProperties = { visibility: 'hidden' }
  return (
    <div ref={ref} style={style}>
      {props.children}
    </div>
  )
}