# Stats Charts Feature

## Overview
All stats components in the BlackMarket Ledger now display interactive charts when clicked, showing daily, weekly, and monthly trends for key metrics.

## Updated Components

### Main Dashboard (`app/page.tsx`)
- **Total Realized Profit**: Click to view cumulative profit trends over time
- **Current Inventory Value**: Click to view inventory value trends
- **Total Mug Loss**: Click to view cumulative mug loss trends
- **Net Total Profit**: Click to view net profit trends (cumulative profit minus cumulative mug losses)

### Abroad Dashboard (`app/abroad/page.tsx`)
- **Abroad Inventory Value**: Click to view abroad-specific inventory trends
- **Abroad Realized Profit**: Click to view abroad-specific profit trends

## Chart Features

### Time Ranges
- **Daily**: Line chart showing last 30 days
- **Weekly**: Bar chart showing last 12 weeks  
- **Monthly**: Bar chart showing last 12 months

### Chart Types
- **Daily view**: Interactive line chart with hover tooltips
- **Weekly/Monthly views**: Bar charts for better period comparison

### Data Calculation
- **Profit**: Shows cumulative realized profit up to each date
- **Inventory Value**: Shows inventory value at the end of each period
- **Mug Loss**: Shows cumulative mug losses up to each date
- **Net Profit**: Shows cumulative profit minus cumulative mug losses (properly accounting for all historical mugs)

### Statistics Summary
Each modal includes:
- Total value across the time period
- Average value per period
- Highest value recorded
- Lowest value recorded

## Technical Implementation

### Dependencies Added
- `recharts`: Lightweight charting library for React
- `date-fns`: Date manipulation utilities

### New Components
- `StatsModal`: Reusable modal component for displaying charts
- Enhanced `StatCard`: Now accepts onClick handlers for interactivity

### Data Processing
- Real-time calculation of inventory values at specific dates
- Proper cost basis tracking for accurate profit calculations
- Support for both normal and abroad transaction filtering
- Cumulative calculations for profit, mug losses, and net profit
- TypeScript type guards for safe transaction filtering

## Usage
Simply click on any stat card to open the trends modal. Use the time range buttons (Daily/Weekly/Monthly) to switch between different views.

## Bug Fixes
- Fixed net total profit calculation to properly account for cumulative mug losses rather than just period-specific losses
- Added proper TypeScript type guards for MugTransaction filtering
- Ensured all metrics show cumulative values for accurate trend analysis

## Future Enhancements
- Export chart data to CSV
- Custom date range selection
- Comparison between different metrics
- Item-specific trend analysis