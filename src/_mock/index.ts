import { setupWorker } from "msw/browser";
import { commentApiHandlers } from "./handlers/_commentApi";
import { mockTokenExpired } from "./handlers/_demo";
import { menuList } from "./handlers/_menu";
import { signIn, userList } from "./handlers/_user";

const handlers = [signIn, userList, mockTokenExpired, menuList, ...commentApiHandlers];
const worker = setupWorker(...handlers);

export { worker };
