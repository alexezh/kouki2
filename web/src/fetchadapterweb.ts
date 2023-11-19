import { IFetchAdapter, getSessionId } from "./fetchadapter";

export class FetchAdapterWeb implements IFetchAdapter {
  get(uri: string): Promise<Response> {
    return fetch(uri);
  }
  post(uri: string, body: string): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(uri, { method: "POST", headers: { "accept": "application/json", "x-session": sessionId }, body: body });
  }
}

/*
function saveAccount(session, url) {
  let account = {
    session: session,
    url: url
  }
  window.localStorage.setItem('account', JSON.stringify(account));
}

function loadAccount() {
  let account = window.localStorage.getItem('account');
  if (account === undefined || account === null) {
    return undefined;
  }

  return account;
}

async function login(): Promise<string | undefined> {
  let name = document.getElementById("userName") as HTMLInputElement;
  let pwd = document.getElementById("pwd") as HTMLInputElement;

  let req = {
    name: name.value,
    pwd: pwd
  };

  try {
    let reqStr = JSON.stringify(req);
    let response = await (await fetch(`/api/login`, { method: "POST", headers: { "accept": "application/json" }, body: reqStr })).json();

    if (response.url !== undefined) {
      location.href = response.url;
    } else {
      return 'Login failed; try again';
    }
  }
  catch (e) {
    return 'Login failed; try again';
  }
}
*/