/** Public support messages have their own sender address and never require an app session. */
export async function sendPublicContact(baseUrl, payload, signal, fetchImpl = fetch) {
  const response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/profile/support/public-contact/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(json?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = json;
    throw error;
  }
  return json;
}
