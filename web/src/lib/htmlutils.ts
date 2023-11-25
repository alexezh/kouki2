export function setElementVisible(elem: HTMLElement | undefined, val: boolean) {
  if (elem === undefined) {
    return;
  }
  elem.style.visibility = (val) ? 'visible' : 'hidden';
}

export function setElementDisplay(elem: HTMLElement | undefined, val: boolean) {
  if (elem === undefined) {
    return;
  }
  elem.style.display = (val) ? 'block' : 'none';
}

export function createTextDiv(): [HTMLDivElement, HTMLSpanElement] {
  let d = document.createElement('div');
  let s = document.createElement('span');
  s.className = 'nes-text is-primary';
  d.appendChild(s);

  return [d, s];
}

export function createButton(parent: HTMLElement, className: string, text: string, handler: (evt: any) => any): HTMLButtonElement {
  let button = document.createElement('button');
  button.textContent = text;
  button.className = className;

  parent.appendChild(button);
  button.addEventListener('click', handler);

  return button;
}

export function createCommandButton(text: string, handler: (evt: any) => any): HTMLButtonElement {
  let button = document.createElement('button');
  button.textContent = text;
  button.className = "commandButton";

  button.addEventListener('click', handler);

  return button;
}

/**
 * 
<div class="inputContainer">
    <label>testy test test</label>
    <div><input /></div>
</div>
 */
export function createTextEntry(
  parent: HTMLElement,
  text: string,
  value: string,
  handler: ((val: string) => any) | undefined): HTMLDivElement {

  let d = document.createElement('div') as HTMLDivElement;
  d.className = 'inputContainer'
  let l = document.createElement('label') as HTMLLabelElement;
  l.textContent = text;

  let d2 = document.createElement('div') as HTMLDivElement;
  let i = document.createElement('input') as HTMLInputElement;
  i.type = 'text';
  i.value = value;

  d.appendChild(l);
  d2.appendChild(i);
  d.appendChild(i);

  if (handler !== undefined) {
    i.addEventListener('input', () => handler(i.value));
  }

  parent.appendChild(d);

  return d;
}

export function createNumberEntry(
  parent: HTMLElement,
  text: string,
  value: number,
  handler: ((val: number) => any) | undefined): HTMLDivElement {

  let d = document.createElement('div') as HTMLDivElement;
  d.className = 'inputContainer'
  let l = document.createElement('label') as HTMLLabelElement;
  l.textContent = text;

  let d2 = document.createElement('div') as HTMLDivElement;
  let i = document.createElement('input') as HTMLInputElement;
  i.type = 'number';
  i.value = value.toString();

  d.appendChild(l);
  d2.appendChild(i);
  d.appendChild(i);

  if (handler !== undefined) {
    i.addEventListener('input', () => handler(parseInt(i.value)));
  }

  parent.appendChild(d);

  return d;
}

export function addText(parent: HTMLElement, text: string, css: string) {
  let elem = document.createElement('div');
  elem.className = css;
  elem.textContent = text;
  parent.appendChild(elem);
}