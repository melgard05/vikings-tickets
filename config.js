/* Vikings Season Ticket Board — settings
   ---------------------------------------------------------------
   Edit this file once. Nothing else needs your database URL, and
   replacing index.html in future will not overwrite what's here.

   1. Paste your Firebase Realtime Database URL between the quotes on
      the "db" line below. It looks like:
        https://vikings-tickets-default-rtdb.firebaseio.com
      (a trailing slash is fine; leave it "" to run local-only)

   2. Commit this file. The status pill turns green and says "Synced".

   Leave "auth" empty unless your database rules require a token.
   Do not put a Firebase secret here — this file is publicly readable.
*/
window.VIKTIX_CONFIG = {
  db: "https://vikings-tickets-default-rtdb.firebaseio.com",
  auth: ""
};
