# Pages

## `/logs/new`
- Compact UI
- Gridlines in table
- Source column
- Reduce opacity (color) of skipped logs

# Backend

## ErrorDetectionService
- "manual-transfer" should have 1/2/3 logs.

## ItemLogService
- costBasis for multiple items in once.
- create "museum-exchange" log
- update "museum-exchange" log

## MuseumService
- Updating the cost of past transactions, doesn't update the cost-basis in museum-exchange wrapper and thus the points.

## BaseService
- Update the BaseService in @lib/domain/BaseService.ts automatically init logger. The other services inheriting the BaseService should only override the service name constant
