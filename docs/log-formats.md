# Supported Log Formats

Learn how to format your data for the tracker.

## Weav3r Receipts & Torn Bazaar Logs

- **Weav3r Receipts**: Paste a Weav3r receipt URL such as `https://weav3r.dev/receipt/RJiDVUO9Is` to fetch trades automatically.
- **Raw Torn Bazaar Logs**: Paste Torn bazaar lines such as `TequilaKing bought 4 x Six-Pack of Alcohol from your bazaar for $3,587,596.` and the Terminal will convert them for import.

## Manual Entry Shorthand

- `b;<item>;<qty>;<price>`: Buy an item using unit price. Example: `b;Xanax;100;830000`
- `b;<item>;<qty>;;<total>`: Buy an item using total cost. Example: `b;Xanax;100;;83000000`
- `s;<item>;<qty>;<price>`: Sell an item. Example: `s;Xanax;50;845000`
- `m;<amount>`: Record mug loss. Example: `m;500000`
- `c;<flushies_per_10_points>;<times>`: Convert flushies to points. Example: `c;13;120`
- `cf;<times>`: Convert flower sets into points. Example: `cf;5`
- `cp;<times>`: Convert plushie sets into points. Example: `cp;10`
