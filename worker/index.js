const RENDER_ORIGIN = "https://vericv-api.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const isApiRequest =
      url.pathname === "/api" || url.pathname.startsWith("/api/");

    if (isApiRequest) {
      const targetUrl = new URL(
        url.pathname + url.search,
        RENDER_ORIGIN
      );

      return fetch(new Request(targetUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};