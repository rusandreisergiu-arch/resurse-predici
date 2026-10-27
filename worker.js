import { onRequest } from "./functions/api/[[route]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const routeParts = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
    return onRequest({ request, env, ctx, params: { route: routeParts } });
  }
};
