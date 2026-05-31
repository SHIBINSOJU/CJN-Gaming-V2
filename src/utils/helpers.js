'use strict';

/**
 * Format milliseconds into a human-readable uptime string.
 * @param {number} ms
 * @returns {string}
 */
function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Calculate uptime percentage from an array of status records.
 * @param {{ timestamp: Date, online: boolean }[]} records
 * @returns {string} e.g. "99.72"
 */
function calcUptimePercent(records) {
  if (!records || records.length < 2) return '100.00';
  let onlineMs = 0;
  for (let i = 1; i < records.length; i++) {
    const diff = records[i].timestamp - records[i - 1].timestamp;
    if (records[i - 1].online) onlineMs += diff;
  }
  const totalMs = records[records.length - 1].timestamp - records[0].timestamp;
  if (totalMs === 0) return '100.00';
  return ((onlineMs / totalMs) * 100).toFixed(2);
}

/**
 * Chunk an array into pages of `size`.
 * @param {any[]} arr
 * @param {number} size
 * @returns {any[][]}
 */
function paginate(arr, size) {
  const pages = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages;
}

/**
 * Replace template variables in a string.
 * @param {string} template
 * @param {Record<string, string>} vars
 * @returns {string}
 */
function resolveVariables(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/**
 * Truncate a string to maxLen, appending '...' if needed.
 */
function truncate(str, maxLen = 100) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { formatUptime, calcUptimePercent, paginate, resolveVariables, truncate, sleep };
