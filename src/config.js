// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG  –  fill these in after completing the Google Cloud setup (see README)
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
  CLIENT_ID: '83246730880-afgt1t5k38lokqes9ttldso10nb5p6rf.apps.googleusercontent.com',

  // The ID from your Google Sheet URL:
  // https://docs.google.com/spreadsheets/d/THIS_PART/edit
  SPREADSHEET_ID: '1OewzpdPmrKh2DEtPFDgVnkAPfKBQjmrLWVy0cNsl-oI',

  // Shared photos folder — recommended for households.
  // 1. Create a folder in YOUR Google Drive
  // 2. Share it with all household members (Editor access)
  // 3. Get the folder ID from its URL:
  //    https://drive.google.com/drive/folders/THIS_PART
  // 4. Paste it below.
  //
  // If left empty, each user's photos go into their own Drive (not shared).
  PHOTOS_FOLDER_ID: '1xe0lrgtD15cPJC45u2RWwlHMVJpGFe2i',
};
