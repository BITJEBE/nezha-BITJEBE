# nezha-BITJEBE

A customized [Komari Monitor](https://github.com/komari-monitor/komari) theme, forked from [nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1).

## Features

### Traffic Progress Bar
- Built-in traffic usage progress bar for each server card (no external scripts needed)
- Supports all traffic calculation modes: `sum` (bidirectional), `max`, `min`, `up`, `down`
- HSL color gradient (green -> yellow -> red) based on usage percentage
- Rotating info display: usage %, reset countdown, billing type
- Precisely matched to each server by ID (no name-matching issues with duplicate names)

### Enhanced Tag System
- Supports multiple tags separated by `;` (matching Komari backend format)
- Color tags: append `<color>` to specify tag color, e.g. `So-net<red>;CDN<blue>`
- Supports all [Radix UI colors](https://www.radix-ui.com/themes/docs/theme/color): Gray, Gold, Red, Blue, Green, Purple, Teal, Sky, etc.
- Auto color assignment: tags without a specified color are automatically assigned a visually distinct color based on text hash

### Service Tracker
- 30-day service availability monitoring with daily up/down/delay statistics
- Data sourced from Komari's `common:getRecords` ping tasks
- Average delay calculation excludes days with no data

### Other Improvements
- GPU section removed from server detail page (Komari backend does not support GPU data)
- Site description in header fetched from Komari backend settings
- Clean codebase with no external script dependencies

## Installation

### Method 1: Upload via Komari Admin Panel
1. Download the latest release zip from [Releases](https://github.com/BITJEBE/nezha-BITJEBE/releases)
2. Go to Komari admin panel -> Theme Management
3. Click upload and select the zip file

### Method 2: Build from Source
```bash
git clone https://github.com/BITJEBE/nezha-BITJEBE.git
cd nezha-BITJEBE
npm install
npm run build
```
The built files will be in the `dist/` directory. Package `dist/` along with `komari-theme.json` into a zip file and upload to Komari.

## Configuration

### Traffic Limit
Set in Komari backend per server:
- `traffic_limit`: Traffic cap in bytes
- `traffic_limit_type`: `sum` | `max` | `min` | `up` | `down`
- `expired_at`: Expiry date (used to calculate traffic reset countdown)

### Tags
Set in Komari backend's tag field per server:
```
So-net<red>;1Gbps<green>;CN2 GIA<blue>
```
- Separate multiple tags with `;`
- Append `<color>` to specify color
- Tags without color get auto-assigned colors

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- TanStack React Query
- Recharts
- Framer Motion
- i18next (zh-CN / en)

## Credits

- Original theme: [nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1) by [Akizon77](https://github.com/Akizon77)
- Monitor backend: [Komari Monitor](https://github.com/komari-monitor/komari)

## Contributors

- [BITJEBE](https://github.com/BITJEBE) - Project owner
- [Claude](https://claude.ai) - AI-assisted development

## License

MIT
 
 
