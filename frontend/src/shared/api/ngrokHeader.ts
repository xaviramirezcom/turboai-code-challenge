/** ngrok's free plan serves an HTML interstitial ("You are about to visit...")
 * on the first request to a tunnel, which arrives where JSON is expected and
 * makes the API look broken. This header opts out of it.
 *
 * Sent unconditionally: it is meaningless to any non-ngrok host, and keeping it
 * unconditional avoids the request behaving differently depending on where the
 * API happens to live. The backend allows it in CORS_ALLOW_HEADERS (settings.py)
 * — a custom header makes even a GET non-simple, so without that the preflight
 * would fail.
 */
export const NGROK_SKIP_WARNING_HEADER: Readonly<Record<string, string>> = {
  'ngrok-skip-browser-warning': 'true',
};
