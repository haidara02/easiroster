import http from 'node:http';
import { URL } from 'node:url';
import { defaultDateRange, generateRosterIcs, validateDate } from './service.js';

const PORT = process.env.PORT || 3000;

async function handleRosterRequest(req, res, url) {
  let dateFrom = url.searchParams.get('dateFrom');
  let dateTo = url.searchParams.get('dateTo');

  if (!dateFrom || !dateTo) {
    const range = defaultDateRange();
    dateFrom = range.from;
    dateTo = range.to;
  }

  try {
    dateFrom = validateDate(dateFrom, 'dateFrom');
    dateTo = validateDate(dateTo, 'dateTo');
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(err.message);
    return;
  }

  try {
    const { ics } = await generateRosterIcs({ dateFrom, dateTo });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(ics);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Failed to generate roster.');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  if (url.pathname === '/roster.ics') {
    await handleRosterRequest(req, res, url);
    return;
  }

  if (url.pathname === '/' || url.pathname === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('OK');
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Roster server listening on port ${PORT}`);
});

