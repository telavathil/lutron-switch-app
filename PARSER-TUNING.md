# PDF Parser Tuning Guide

The PDF parsers in this application extract keypad configuration data from Lutron HomeWorks PDF reports. The parsers use regex patterns that need to be tuned to match your specific PDF format.

## How to Tune the Parsers

### Step 1: Upload PDFs and Check Logs

1. Start the server with `npm run start:dev`
2. Upload your Engraving and Programming Report PDFs through the import wizard
3. Check the server console output for:
   - `=== ENGRAVING PDF TEXT (first 1000 chars) ===`
   - `=== PROGRAMMING PDF TEXT (first 1000 chars) ===`
   - `Found X keypad sections`
   - `Found X button logic entries`
   - `Found X loads`

### Step 2: Update Regex Patterns

Based on the actual PDF text format, update the regex patterns in:

#### `src/services/engraving-parser.service.ts`

Key patterns to adjust:
- **Area/Room extraction**: `Area Path:\s*(.+?)(?:\r?\n|$)`
- **Model extraction**: `Model #:\s*([A-Z0-9-]+)`
- **Gang position**: `Gang Position:\s*(\d+)`
- **Button labels**: `Button\s+(\d+).*?Engraving:\s*(.+?)(?:\r?\n|Alignment)`

#### `src/services/programming-parser.service.ts`

Key patterns to adjust:
- **Input/Button logic**: `Input\s+(\d+).*?Type:\s*(Toggle|Single Action).*?LED Logic:\s*(.+?)(?:\r?\n)`
- **Load actions**: `(.+?)\s+(\d+)%\s+([\d.]+)s\s+([\d.]+)s`
- **Loads/Zones**: `Zone:\s*(.+?)\s+Area:\s*(.+?)\s+Room:\s*(.+?)\s+Type:\s*(Dimmer|Switched)`

### Step 3: Test Incrementally

After updating patterns:
1. Rebuild: `npm run build`
2. Restart server
3. Re-upload PDFs
4. Check console logs to see if more sections/items are found
5. Repeat until all keypads, buttons, and loads are extracted

### Step 4: Verify Merged Data

Once parsing works:
1. Check the import result shows the correct keypad count
2. Navigate to the Dashboard to view keypads
3. Click on keypads to verify button labels
4. Check that button logic is properly merged

## Common Issues

### No Keypads Found
- Check if "Area Path:" or similar text exists in the PDF
- PDF may use different terminology (e.g., "Location:", "Area:", etc.)
- Try searching for unique keywords in your PDF

### Buttons Not Parsing
- Button labels may be in a table format
- Check if there's a column header like "Engraving" or "Label"
- May need to parse table rows instead of inline text

### Load Actions Missing
- Programming Report may use different terminology
- Check for "Command Level", "Fade Time", "Delay" or similar
- May need to adjust load table parsing logic

## Alternative: Manual Testing

If you want to test the UI without real PDFs, you can modify the parser services to return mock data:

```typescript
// In engraving-parser.service.ts
async parseEngravingReport(pdfPath: string): Promise<EngravingParseResult> {
  return {
    keypads: [{
      id: 'test-keypad-1',
      location: { area: 'Test Area', room: 'Test Room' },
      model: '6-button',
      wallplate: { type: 'standard', color: 'BL', gangPosition: 1, backboxSize: 0 },
      faceplate: { alignment: 'center', fontType: 'standard', fontSize: 12 },
      buttons: [
        {
          id: 'test-btn-1',
          keypadId: 'test-keypad-1',
          inputNumber: 1,
          position: 1,
          engraving: { label: 'Welcome', alignment: 'center', fontType: 'standard', fontSize: 10 },
          logic: { type: 'toggle', ledLogic: { type: 'scene', sceneNumber: 1 }, actions: {} },
        },
        // ... more buttons
      ],
    }],
    errors: [],
  };
}
```

This allows you to test the full UI flow while you work on tuning the parsers.
