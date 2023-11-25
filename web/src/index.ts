import { setFetchAdapter } from "./lib/fetchadapter";
import { FetchAdapterWeb } from "./lib/fetchadapterweb";
import { App } from "./app";

// root object for index code
export var gameApp = new App();
setFetchAdapter(new FetchAdapterWeb());

