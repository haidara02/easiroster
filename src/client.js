import axios from "axios";

export function createApiClient({
  baseUrl,
  bearerToken,
  cookie,
  userAgent,
  acceptLanguage,
  origin,
  referer,
  secChUa,
  secChUaPlatform,
  secChUaMobile,
  secGpc,
  extraHeaders,
}) {
  const headers = {};

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  if (userAgent) headers["User-Agent"] = userAgent;
  if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;
  if (origin) headers.Origin = origin;
  if (referer) headers.Referer = referer;
  if (secChUa) headers["Sec-CH-UA"] = secChUa;
  if (secChUaPlatform) headers["Sec-CH-UA-Platform"] = secChUaPlatform;
  if (secChUaMobile) headers["Sec-CH-UA-Mobile"] = secChUaMobile;
  if (secGpc) headers["Sec-GPC"] = secGpc;

  if (extraHeaders && typeof extraHeaders === "object") {
    Object.assign(headers, extraHeaders);
  }

  return axios.create({
    baseURL: baseUrl,
    headers,
    timeout: 15_000,
  });
}

export async function fetchRoster(client, { personNumber, dateFrom, dateTo }) {
  const path = `${personNumber}/employeeEntity/Coles/dateFrom/${dateFrom}/dateTo/${dateTo}`;
  const { data } = await client.get(`/${path}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}
