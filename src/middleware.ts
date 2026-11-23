import { getActionContext } from "astro:actions";
import { defineMiddleware } from "astro:middleware";
import { SessionKey } from "./consts/session";

const loginPath = "/admin/prijava";

// Guards every /admin page (except the login page) and every action in the
// `admin` namespace. Public requests never read the session, so they get no
// cookie and cause no KV traffic.
export const onRequest = defineMiddleware(async (context, next) => {
  // A 404 from an admin page renders the public 404 page in a second pass
  // with the same URL. That page has no data, so it needs no guard.
  if (context.routePattern === "/404") {
    return next();
  }
  const path = context.url.pathname;
  const isAdminPath = path.startsWith("/admin");
  const action = getActionContext(context).action;
  const isAdminAction = action?.name.startsWith("admin.") ?? false;
  if (!isAdminPath && !isAdminAction) {
    return next();
  }

  const needsLogin = isAdminAction || path !== loginPath;
  if (needsLogin) {
    const isAdmin = await context.session?.get(SessionKey.isAdmin);
    if (isAdmin !== true && isAdminAction) {
      return new Response(null, { status: 403 });
    }
    if (isAdmin !== true) {
      return context.redirect(loginPath);
    }
  }

  const response = await next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
