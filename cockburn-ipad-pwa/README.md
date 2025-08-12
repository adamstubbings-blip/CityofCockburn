# Cockburn iPad Inspection PWA

Offline-first React + TypeScript PWA for RFQ12/2025 building condition assessments.
- Import **Buildings CSV** (from Appendix A parse) and/or the **Master Excel** we prepared.
- Capture ratings, defects, photos (camera), GPS, and polygon IDs.
- One-click **Export to Excel** in the same sheet/column structure as your tender workbook.
- Run your `export_reports.py` (provided earlier) to generate per-building Word reports.

## Quick start
```bash
# 1. Extract and install
npm install

# 2. Run
npm run dev

# 3. Open on iPad Safari (same network): http://<your-ip>:5173
#    Add to Home Screen for offline use.
```

## Import data
- Use **Buildings CSV**: `Cockburn_Buildings_From_AppendixA.csv`
- Or import the **Master Excel**: `Cockburn_Condition_Audit_Templates.xlsx`
  - App will read `Buildings`, `Lists_FunctionalAreas`, and `Lists_Components_Detailed`.

## Export
Tap **Export Excel** to download `Cockburn_Condition_Audit_Data.xlsx`, then on your laptop run:
```bash
python export_reports.py
```
to create Word reports per building.

## Notes
- Photos are stored locally (IndexedDB). The Excel export references filenames; if you need actual embedding into Word, we can add an image-embed pipeline next.
- Service worker is included for basic offline startup; extend caching as needed.
