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

## New Error in Auto-Pilot

- forward-logs-shared.ts:95 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 [HMR] connected
drive-api.ts:66  POST https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/sync-google-drive 500 (Internal Server Error)
getGoogleDriveStatus @ drive-api.ts:66
ServiceRail.useEffect.loadServiceState @ ServiceRail.tsx:62
await in ServiceRail.useEffect.loadServiceState
ServiceRail.useEffect @ ServiceRail.tsx:85
react_stack_bottom_frame @ react-dom-client.development.js:28123
runWithFiberInDEV @ react-dom-client.development.js:986
commitHookEffectListMount @ react-dom-client.development.js:13692
commitHookPassiveMountEffects @ react-dom-client.development.js:13779
commitPassiveMountOnFiber @ react-dom-client.development.js:16733
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16753
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16753
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16753
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16753
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16725
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:17010
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:16678
commitPassiveMountOnFiber @ react-dom-client.development.js:16768
flushPassiveEffects @ react-dom-client.development.js:19859
flushPendingEffects @ react-dom-client.development.js:19785
flushSpawnedWork @ react-dom-client.development.js:19741
commitRoot @ react-dom-client.development.js:19335
commitRootWhenReady @ react-dom-client.development.js:18178
performWorkOnRoot @ react-dom-client.development.js:18054
performSyncWorkOnRoot @ react-dom-client.development.js:20399
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:20241
dispatchEvent @ react-dom-client.development.js:25737
dispatchDiscreteEvent @ react-dom-client.development.js:25661
<ServiceRail>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:342
LayoutWrapper @ LayoutWrapper.tsx:106
react_stack_bottom_frame @ react-dom-client.development.js:28038
renderWithHooksAgain @ react-dom-client.development.js:8084
renderWithHooks @ react-dom-client.development.js:7996
updateFunctionComponent @ react-dom-client.development.js:10501
beginWork @ react-dom-client.development.js:12085
runWithFiberInDEV @ react-dom-client.development.js:986
performUnitOfWork @ react-dom-client.development.js:18997
workLoopSync @ react-dom-client.development.js:18825
renderRootSync @ react-dom-client.development.js:18806
performWorkOnRoot @ react-dom-client.development.js:17835
performSyncWorkOnRoot @ react-dom-client.development.js:20399
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:20241
dispatchEvent @ react-dom-client.development.js:25737
dispatchDiscreteEvent @ react-dom-client.development.js:25661
"use client"
RootLayout @ layout.tsx:94
initializeElement @ react-server-dom-turbopack-client.browser.development.js:1941
(anonymous) @ react-server-dom-turbopack-client.browser.development.js:4623
initializeModelChunk @ react-server-dom-turbopack-client.browser.development.js:1828
getOutlinedModel @ react-server-dom-turbopack-client.browser.development.js:2337
parseModelString @ react-server-dom-turbopack-client.browser.development.js:2729
(anonymous) @ react-server-dom-turbopack-client.browser.development.js:4554
initializeModelChunk @ react-server-dom-turbopack-client.browser.development.js:1828
resolveModelChunk @ react-server-dom-turbopack-client.browser.development.js:1672
processFullStringRow @ react-server-dom-turbopack-client.browser.development.js:4442
processFullBinaryRow @ react-server-dom-turbopack-client.browser.development.js:4300
processBinaryChunk @ react-server-dom-turbopack-client.browser.development.js:4523
progress @ react-server-dom-turbopack-client.browser.development.js:4799
<RootLayout>
initializeFakeTask @ react-server-dom-turbopack-client.browser.development.js:3390
initializeDebugInfo @ react-server-dom-turbopack-client.browser.development.js:3415
initializeDebugChunk @ react-server-dom-turbopack-client.browser.development.js:1772
processFullStringRow @ react-server-dom-turbopack-client.browser.development.js:4389
processFullBinaryRow @ react-server-dom-turbopack-client.browser.development.js:4300
processBinaryChunk @ react-server-dom-turbopack-client.browser.development.js:4523
progress @ react-server-dom-turbopack-client.browser.development.js:4799
"use server"
ResponseInstance @ react-server-dom-turbopack-client.browser.development.js:2784
createResponseFromOptions @ react-server-dom-turbopack-client.browser.development.js:4660
exports.createFromReadableStream @ react-server-dom-turbopack-client.browser.development.js:5064
module evaluation @ app-index.tsx:211
(anonymous) @ dev-base.ts:244
runModuleExecutionHooks @ dev-base.ts:278
instantiateModule @ dev-base.ts:238
getOrInstantiateModuleFromParent @ dev-base.ts:162
commonJsRequire @ runtime-utils.ts:389
(anonymous) @ app-next-turbopack.ts:11
(anonymous) @ app-bootstrap.ts:79
loadScriptsInSequence @ app-bootstrap.ts:23
appBootstrap @ app-bootstrap.ts:61
module evaluation @ app-next-turbopack.ts:10
(anonymous) @ dev-base.ts:244
runModuleExecutionHooks @ dev-base.ts:278
instantiateModule @ dev-base.ts:238
getOrInstantiateRuntimeModule @ dev-base.ts:128
registerChunk @ runtime-backend-dom.ts:57
await in registerChunk
registerChunk @ dev-base.ts:1149
(anonymous) @ dev-backend-dom.ts:126
(anonymous) @ dev-backend-dom.ts:126
Logger.ts:50 [SyncService] Initializing auto-pilot cursor at 5/1/2026, 2:02:00 PM
Logger.ts:50 [SyncService] Starting global sync from cursor: {lastTimestamp: 1777624320, lastLogId: ''}
debug.ts:10 TornAPI.getTornTrades: All trades fetched (2) [{…}, {…}]
debug.ts:10 undefined 'https://api.torn.com/v2/user/6748794/trade?comment=Blackmarket+Ledger'
debug.ts:10 undefined 'https://api.torn.com/v2/user/6745582/trade?comment=Blackmarket+Ledger'
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6748794, timestamp: 1778034998, description: 'Bjsjs', user: {…}, trader: {…}, …}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6745582, timestamp: 1777984666, description: 'Hi! How have you been?', user: {…}, trader: {…}, …}
debug.ts:10 T3BAPI.getReceipts: Fetching next page https://weav3r.dev/api/trades/3165209?from=1777588320&to=1778056365&apiKey=ZtaSA9Aj8watVePb
debug.ts:10 T3BAPI.getReceipt: Response JSON {id: 'OHz8djwFiw', trade_id: '12092898', buyer_name: 'micnut', total_value: 27841966, item_count: 20, …}
page.tsx:106 ReferenceError: getWeav3rUserId is not defined
    at SyncService.startGlobalSync (_3fb9b017._.js:4902:30)
    at async handleSync (page.tsx:103:13)
error @ intercept-console-error.ts:42
handleSync @ page.tsx:106
await in handleSync
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
<button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:342
NewAutoPilotPage @ page.tsx:147
react_stack_bottom_frame @ react-dom-client.development.js:28038
renderWithHooksAgain @ react-dom-client.development.js:8084
renderWithHooks @ react-dom-client.development.js:7996
updateFunctionComponent @ react-dom-client.development.js:10501
beginWork @ react-dom-client.development.js:12136
runWithFiberInDEV @ react-dom-client.development.js:986
performUnitOfWork @ react-dom-client.development.js:18997
workLoopSync @ react-dom-client.development.js:18825
renderRootSync @ react-dom-client.development.js:18806
performWorkOnRoot @ react-dom-client.development.js:17835
performSyncWorkOnRoot @ react-dom-client.development.js:20399
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:20241
dispatchEvent @ react-dom-client.development.js:25737
dispatchDiscreteEvent @ react-dom-client.development.js:25661
<NewAutoPilotPage>
exports.jsx @ react-jsx-runtime.development.js:342
ClientPageRoot @ client-page.tsx:83
react_stack_bottom_frame @ react-dom-client.development.js:28038
renderWithHooksAgain @ react-dom-client.development.js:8084
renderWithHooks @ react-dom-client.development.js:7996
updateFunctionComponent @ react-dom-client.development.js:10501
beginWork @ react-dom-client.development.js:12085
runWithFiberInDEV @ react-dom-client.development.js:986
performUnitOfWork @ react-dom-client.development.js:18997
workLoopSync @ react-dom-client.development.js:18825
renderRootSync @ react-dom-client.development.js:18806
performWorkOnRoot @ react-dom-client.development.js:17835
performSyncWorkOnRoot @ react-dom-client.development.js:20399
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:20241
dispatchEvent @ react-dom-client.development.js:25737
dispatchDiscreteEvent @ react-dom-client.development.js:25661
"use client"
Function.all @ VM706 <anonymous>:1
Function.all @ VM706 <anonymous>:1
Function.all @ VM706 <anonymous>:1
initializeElement @ react-server-dom-turbopack-client.browser.development.js:1940
(anonymous) @ react-server-dom-turbopack-client.browser.development.js:4623
initializeModelChunk @ react-server-dom-turbopack-client.browser.development.js:1828
resolveModelChunk @ react-server-dom-turbopack-client.browser.development.js:1672
processFullStringRow @ react-server-dom-turbopack-client.browser.development.js:4442
processFullBinaryRow @ react-server-dom-turbopack-client.browser.development.js:4300
processBinaryChunk @ react-server-dom-turbopack-client.browser.development.js:4523
progress @ react-server-dom-turbopack-client.browser.development.js:4799
"use server"
ResponseInstance @ react-server-dom-turbopack-client.browser.development.js:2784
createResponseFromOptions @ react-server-dom-turbopack-client.browser.development.js:4660
exports.createFromReadableStream @ react-server-dom-turbopack-client.browser.development.js:5064
module evaluation @ app-index.tsx:211
(anonymous) @ dev-base.ts:244
runModuleExecutionHooks @ dev-base.ts:278
instantiateModule @ dev-base.ts:238
getOrInstantiateModuleFromParent @ dev-base.ts:162
commonJsRequire @ runtime-utils.ts:389
(anonymous) @ app-next-turbopack.ts:11
(anonymous) @ app-bootstrap.ts:79
loadScriptsInSequence @ app-bootstrap.ts:23
appBootstrap @ app-bootstrap.ts:61
module evaluation @ app-next-turbopack.ts:10
(anonymous) @ dev-base.ts:244
runModuleExecutionHooks @ dev-base.ts:278
instantiateModule @ dev-base.ts:238
getOrInstantiateRuntimeModule @ dev-base.ts:128
registerChunk @ runtime-backend-dom.ts:57
await in registerChunk
registerChunk @ dev-base.ts:1149
(anonymous) @ dev-backend-dom.ts:126
(anonymous) @ dev-backend-dom.ts:126
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 127ms
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 97ms
Logger.ts:50 [SyncService] Starting global sync from cursor: {lastTimestamp: 1777624320, lastLogId: ''}
debug.ts:10 TornAPI.getTornTrades: All trades fetched (2) [{…}, {…}]
debug.ts:10 undefined 'https://api.torn.com/v2/user/6748794/trade?comment=Blackmarket+Ledger'
debug.ts:10 undefined 'https://api.torn.com/v2/user/6745582/trade?comment=Blackmarket+Ledger'
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6748794, timestamp: 1778034998, description: 'Bjsjs', user: {…}, trader: {…}, …}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6745582, timestamp: 1777984666, description: 'Hi! How have you been?', user: {…}, trader: {…}, …}
debug.ts:10 T3BAPI.getReceipts: Fetching next page https://weav3r.dev/api/trades/3165209?from=1777588320&to=1778056394&apiKey=ZtaSA9Aj8watVePb
debug.ts:10 T3BAPI.getReceipt: Response JSON {id: 'OHz8djwFiw', trade_id: '12092898', buyer_name: 'micnut', total_value: 27841966, item_count: 20, …}
Logger.ts:50 [SyncService] Fetched 2 trades and 1 receipts.
Logger.ts:50 [TradeService] Fetching trade 6748794 from Torn API
debug.ts:10 undefined 'https://api.torn.com/v2/user/6748794/trade?comment=Blackmarket+Ledger'
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6748794, timestamp: 1778034998, description: 'Bjsjs', user: {…}, trader: {…}, …}
Logger.ts:50 [TradeService] Determining trade type for trade 6748794. Our ID: 3165209
Logger.ts:50 [TradeService] Entry counts - Ours (Sent): 1, Theirs (Received): 20
Logger.ts:50 [TradeService] Detected BUY trade: We sent only money (Buy), they sent only items.
Logger.ts:50 [TradeService] Created wrapper 54 for trade 6748794
Logger.ts:50 [TradeService] Created trade record 19 in database
Logger.ts:50 [TradeService] Persisted 21 trade items for trade 6748794
Logger.ts:50 [TradeService] Processing buy-trade ingestion for 6748794. Total money paid: 27841966
Logger.ts:50 [TradeService] Total market value of received items: 27434939
Logger.ts:50 [TradeService] Trade 6748794: Proportional basis = 1.0148 (Paid 27841966 for 27434939 MP)
Logger.ts:50 [TradeService] Adding log for item 97: qty=4, unit_price=242.54582355732595
Logger.ts:50 [TradeService] Adding log for item 129: qty=13, unit_price=307.49533279443415
Logger.ts:50 [TradeService] Adding log for item 183: qty=9, unit_price=314.59918536724285
Logger.ts:50 [TradeService] Adding log for item 184: qty=7, unit_price=510.46254916039726
Logger.ts:50 [TradeService] Adding log for item 186: qty=1, unit_price=518.5812378150358
Logger.ts:50 [TradeService] Adding log for item 187: qty=99, unit_price=519.5960738968656
Logger.ts:50 [TradeService] Adding log for item 215: qty=1, unit_price=580.4862388066546
Logger.ts:50 [TradeService] Adding log for item 258: qty=1, unit_price=14555.793921685046
Logger.ts:50 [TradeService] Adding log for item 261: qty=1, unit_price=6406.660184591627
Logger.ts:50 [TradeService] Adding log for item 266: qty=2, unit_price=32709.18175345679
Logger.ts:50 [TradeService] Adding log for item 269: qty=19, unit_price=34531.827356423135
Logger.ts:50 [TradeService] Adding log for item 272: qty=44, unit_price=11622.91764519688
Logger.ts:50 [TradeService] Adding log for item 273: qty=21, unit_price=11559.99780812343
Logger.ts:50 [TradeService] Adding log for item 281: qty=21, unit_price=65217.42596271128
Logger.ts:50 [TradeService] Adding log for item 384: qty=147, unit_price=78768.5321633848
Logger.ts:50 [TradeService] Adding log for item 385: qty=189, unit_price=70424.54989858005
Logger.ts:50 [TradeService] Adding log for item 901: qty=21, unit_price=271.9760699303906
Logger.ts:50 [TradeService] Adding log for item 902: qty=26, unit_price=241.53098747549612
Logger.ts:50 [TradeService] Adding log for item 903: qty=2, unit_price=4081.6707211195185
Logger.ts:50 [TradeService] Adding log for item 904: qty=10, unit_price=246.6051678846452
Logger.ts:50 [TradeService] Triggering cost-basis update from timestamp 1778034998000
Logger.ts:50 [ItemLogService] Updating cost-basis globally for 20 items from 1778034998000
Logger.ts:50 [ItemLogService] Processing log: 145 for item: 97
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 97
Logger.ts:50 [ItemLogService] Processing log: 146 for item: 129
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 129
Logger.ts:50 [ItemLogService] Processing log: 147 for item: 183
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 183
Logger.ts:50 [ItemLogService] Processing log: 148 for item: 184
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 184
Logger.ts:50 [ItemLogService] Processing log: 149 for item: 186
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 186
Logger.ts:50 [ItemLogService] Processing log: 150 for item: 187
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 187
Logger.ts:50 [ItemLogService] Processing log: 151 for item: 215
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 215
Logger.ts:50 [ItemLogService] Processing log: 152 for item: 258
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 258
Logger.ts:50 [ItemLogService] Processing log: 153 for item: 261
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 261
Logger.ts:50 [ItemLogService] Processing log: 154 for item: 266
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 266
Logger.ts:50 [ItemLogService] Processing log: 155 for item: 269
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 269
Logger.ts:50 [ItemLogService] Processing log: 156 for item: 272
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 272
Logger.ts:50 [ItemLogService] Processing log: 157 for item: 273
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 273
Logger.ts:50 [ItemLogService] Processing log: 158 for item: 281
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 281
Logger.ts:50 [ItemLogService] Processing log: 159 for item: 384
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 384
Logger.ts:50 [ItemLogService] Processing log: 160 for item: 385
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 385
Logger.ts:50 [ItemLogService] Processing log: 161 for item: 901
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 901
Logger.ts:50 [ItemLogService] Processing log: 162 for item: 902
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 902
Logger.ts:50 [ItemLogService] Processing log: 163 for item: 903
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 903
Logger.ts:50 [ItemLogService] Processing log: 164 for item: 904
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 904
Logger.ts:50 [TradeService] Successfully finished fetchAndCreateTrade for 6748794
Logger.ts:50 [SyncService] Matched trade 6748794 with receipt OHz8djwFiw. Linking...
Logger.ts:50 [ReceiptService] Fetching weav3r receipt OHz8djwFiw
debug.ts:10 T3BAPI.getReceipt: Response JSON {id: 'OHz8djwFiw', trade_id: '12092898', buyer_name: 'micnut', total_value: 27841966, item_count: 20, …}
Logger.ts:50 [ReceiptService] Successfully created weav3r receipt with 20 items
Logger.ts:50 [TradeService] Linking trade 19 to receipt 3
Logger.ts:50 [TradeService] Validating trade items (21) against receipt items (20)
Logger.ts:50 [TradeService] Trade money paid: 27841966, Receipt total: 27841966
Logger.ts:50 [TradeService] Validation successful for trade 19 and receipt 3
Logger.ts:50 [TradeService] Updating item logs with precise prices for buy-trade 6748794
Logger.ts:50 [TradeService] Found 20 related logs to update.
Logger.ts:50 [TradeService] Updating item 97 price: 242.54582355732595 -> 215
Logger.ts:50 [TradeService] Updating item 129 price: 307.49533279443415 -> 273
Logger.ts:50 [TradeService] Updating item 183 price: 314.59918536724285 -> 279
Logger.ts:50 [TradeService] Updating item 184 price: 510.46254916039726 -> 453
Logger.ts:50 [TradeService] Updating item 186 price: 518.5812378150358 -> 501
Logger.ts:50 [TradeService] Updating item 187 price: 519.5960738968656 -> 502
Logger.ts:50 [TradeService] Updating item 215 price: 580.4862388066546 -> 581
Logger.ts:50 [TradeService] Updating item 258 price: 14555.793921685046 -> 14486
Logger.ts:50 [TradeService] Updating item 261 price: 6406.660184591627 -> 6187
Logger.ts:50 [TradeService] Updating item 266 price: 32709.18175345679 -> 32747
Logger.ts:50 [TradeService] Updating item 269 price: 34531.827356423135 -> 34367
Logger.ts:50 [TradeService] Updating item 272 price: 11622.91764519688 -> 12255
Logger.ts:50 [TradeService] Updating item 273 price: 11559.99780812343 -> 12074
Logger.ts:50 [TradeService] Updating item 281 price: 65217.42596271128 -> 66192
Logger.ts:50 [TradeService] Updating item 384 price: 78768.5321633848 -> 78859
Logger.ts:50 [TradeService] Updating item 385 price: 70424.54989858005 -> 70089
Logger.ts:50 [TradeService] Updating item 901 price: 271.9760699303906 -> 241
Logger.ts:50 [TradeService] Updating item 902 price: 241.53098747549612 -> 214
Logger.ts:50 [TradeService] Updating item 903 price: 4081.6707211195185 -> 3620
Logger.ts:50 [TradeService] Updating item 904 price: 246.6051678846452 -> 219
Logger.ts:50 [TradeService] Triggering cost-basis update from timestamp 1778034998000
Logger.ts:50 [ItemLogService] Updating cost-basis globally for 20 items from 1778034998000
Logger.ts:50 [ItemLogService] Processing log: 145 for item: 97
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 97
Logger.ts:50 [ItemLogService] Processing log: 146 for item: 129
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 129
Logger.ts:50 [ItemLogService] Processing log: 147 for item: 183
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 183
Logger.ts:50 [ItemLogService] Processing log: 148 for item: 184
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 184
Logger.ts:50 [ItemLogService] Processing log: 149 for item: 186
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 186
Logger.ts:50 [ItemLogService] Processing log: 150 for item: 187
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 187
Logger.ts:50 [ItemLogService] Processing log: 151 for item: 215
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 215
Logger.ts:50 [ItemLogService] Processing log: 152 for item: 258
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 258
Logger.ts:50 [ItemLogService] Processing log: 153 for item: 261
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 261
Logger.ts:50 [ItemLogService] Processing log: 154 for item: 266
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 266
Logger.ts:50 [ItemLogService] Processing log: 155 for item: 269
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 269
Logger.ts:50 [ItemLogService] Processing log: 156 for item: 272
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 272
Logger.ts:50 [ItemLogService] Processing log: 157 for item: 273
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 273
Logger.ts:50 [ItemLogService] Processing log: 158 for item: 281
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 281
Logger.ts:50 [ItemLogService] Processing log: 159 for item: 384
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 384
Logger.ts:50 [ItemLogService] Processing log: 160 for item: 385
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 385
Logger.ts:50 [ItemLogService] Processing log: 161 for item: 901
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 901
Logger.ts:50 [ItemLogService] Processing log: 162 for item: 902
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 902
Logger.ts:50 [ItemLogService] Processing log: 163 for item: 903
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 903
Logger.ts:50 [ItemLogService] Processing log: 164 for item: 904
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 904
Logger.ts:50 [TradeService] Successfully linked receipt 3 to trade 19
Logger.ts:50 [TradeService] Fetching trade 6745582 from Torn API
debug.ts:10 undefined 'https://api.torn.com/v2/user/6745582/trade?comment=Blackmarket+Ledger'
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {trade: {…}}
debug.ts:10 TornAPI.getTornTrade: Trade details fetched {id: 6745582, timestamp: 1777984666, description: 'Hi! How have you been?', user: {…}, trader: {…}, …}
Logger.ts:50 [TradeService] Determining trade type for trade 6745582. Our ID: 3165209
Logger.ts:50 [TradeService] Entry counts - Ours (Sent): 2, Theirs (Received): 1
Logger.ts:50 [TradeService] Detected SELL trade: We sent only items (Sell), they sent only money.
Logger.ts:50 [TradeService] Created wrapper 55 for trade 6745582
Logger.ts:50 [TradeService] Created trade record 20 in database
Logger.ts:50 [TradeService] Persisted 3 trade items for trade 6745582
Logger.ts:50 [TradeService] Processing sell-trade ingestion for 6745582. Total money received: 615000
Logger.ts:50 [TradeService] Total market value of sent items: 616170
Logger.ts:50 [TradeService] Trade 6745582: Proportional revenue = 0.9981 (Received 615000 for 616170 MP)
Logger.ts:50 [TradeService] Adding log for item 187: qty=-100, unit_price=511.0278007692682
Logger.ts:50 [TradeService] Adding log for item 274: qty=-10, unit_price=56389.72199230731
Logger.ts:50 [TradeService] Triggering cost-basis update from timestamp 1777984666000
Logger.ts:50 [ItemLogService] Updating cost-basis globally for 21 items from 1777984666000
Logger.ts:50 [ItemLogService] Processing log: 165 for item: 187
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 55 for item 187
Logger.ts:50 [ItemLogService]  Over-sell detected for item 187 in normal: requested 100, available 0. Splitting.
Logger.ts:50 [ItemLogService] Processing log: 166 for item: 274
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 55 for item 274
Logger.ts:50 [ItemLogService]  Over-sell detected for item 274 in normal: requested 10, available 0. Splitting.
Logger.ts:50 [ItemLogService] Processing log: 145 for item: 97
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 97
Logger.ts:50 [ItemLogService] Processing log: 146 for item: 129
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 129
Logger.ts:50 [ItemLogService] Processing log: 147 for item: 183
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 183
Logger.ts:50 [ItemLogService] Processing log: 148 for item: 184
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 184
Logger.ts:50 [ItemLogService] Processing log: 149 for item: 186
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 186
Logger.ts:50 [ItemLogService] Processing log: 150 for item: 187
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 187
Logger.ts:50 [ItemLogService] Processing log: 151 for item: 215
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 215
Logger.ts:50 [ItemLogService] Processing log: 152 for item: 258
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 258
Logger.ts:50 [ItemLogService] Processing log: 153 for item: 261
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 261
Logger.ts:50 [ItemLogService] Processing log: 154 for item: 266
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 266
Logger.ts:50 [ItemLogService] Processing log: 155 for item: 269
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 269
Logger.ts:50 [ItemLogService] Processing log: 156 for item: 272
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 272
Logger.ts:50 [ItemLogService] Processing log: 157 for item: 273
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 273
Logger.ts:50 [ItemLogService] Processing log: 158 for item: 281
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 281
Logger.ts:50 [ItemLogService] Processing log: 159 for item: 384
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 384
Logger.ts:50 [ItemLogService] Processing log: 160 for item: 385
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 385
Logger.ts:50 [ItemLogService] Processing log: 161 for item: 901
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 901
Logger.ts:50 [ItemLogService] Processing log: 162 for item: 902
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 902
Logger.ts:50 [ItemLogService] Processing log: 163 for item: 903
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 903
Logger.ts:50 [ItemLogService] Processing log: 164 for item: 904
Logger.ts:50 [ItemLogService] Processing trade-receipt re-evaluation: 54 for item 904
Logger.ts:50 [TradeService] Successfully finished fetchAndCreateTrade for 6745582
debug.ts:10 TornTrade.compareAndLinkReceipt: Receipt already linked (2) [undefined, 6748794]
torn-wrapper.ts:109 {cat: 162}
torn-wrapper.ts:110 (17) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
torn-wrapper.ts:109 {cat: 182}
torn-wrapper.ts:110 (3) [{…}, {…}, {…}]
torn-wrapper.ts:109 {cat: 18}
torn-wrapper.ts:110 (62) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
torn-wrapper.ts:109 {cat: 11}
torn-wrapper.ts:110 (34) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
torn-wrapper.ts:109 {cat: 6}
torn-wrapper.ts:110 (85) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
torn-wrapper.ts:109 {cat: 15}
torn-wrapper.ts:110 (101) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
torn-wrapper.ts:136 (189) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
torn-wrapper.ts:148 Relevant logs (143) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
torn-api.ts:567 {id: 'jQIeSlk0h8zEBDybUspE', timestamp: 1777868998, category: 'Attacking', typeId: 8156, title: 'Attack mug receive', …}
torn-api.ts:573 1260820
torn-api.ts:567 {id: 'VChPjmo6gNn4JHHcsX2J', timestamp: 1777956597, category: 'Attacking', typeId: 8156, title: 'Attack mug receive', …}
torn-api.ts:573 53613
torn-wrapper.ts:158 Found 143 relevant logs, 143 parsed.
Logger.ts:50 [SyncService] Fetched 143 parsed logs.
Logger.ts:60 [SyncService] Could not resolve item ID for name: "points"
warn @ forward-logs-shared.ts:95
warn @ Logger.ts:60
ingestParsedLog @ SyncService.ts:138
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
Logger.ts:60 [SyncService] Could not resolve item ID for name: "points"
warn @ forward-logs-shared.ts:95
warn @ Logger.ts:60
ingestParsedLog @ SyncService.ts:138
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
Logger.ts:60 [SyncService] Could not resolve item ID for name: "points"
warn @ forward-logs-shared.ts:95
warn @ Logger.ts:60
ingestParsedLog @ SyncService.ts:138
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
Logger.ts:60 [SyncService] Could not resolve item ID for name: "points"
warn @ forward-logs-shared.ts:95
warn @ Logger.ts:60
ingestParsedLog @ SyncService.ts:138
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
Logger.ts:60 [SyncService] Could not resolve item ID for name: "points"
warn @ forward-logs-shared.ts:95
warn @ Logger.ts:60
ingestParsedLog @ SyncService.ts:138
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
ItemLog.ts:237 DexieError {name: 'DataError', message: "Failed to execute 'bound' on 'IDBKeyRange': The pa… 'IDBKeyRange': The parameter is not a valid key.", inner: DataError: Failed to execute 'bound' on 'IDBKeyRange': The parameter is not a valid key.
    at mak…}
trace @ forward-logs-shared.ts:95
(anonymous) @ table.ts:113
(anonymous) @ promise.js:812
(anonymous) @ promise.js:494
callListener @ promise.js:494
endMicroTickScope @ promise.js:544
Table._trans @ table.ts:119
Collection._read @ collection.ts:78
Collection.toArray @ collection.ts:208
Collection.first @ collection.ts:318
getLatestTotalsPerCategoryBefore @ ItemLog.ts:237
getLatestTotals @ ItemLogService.ts:112
exchangeSet @ MuseumService.ts:108
Dexie: read item_logs
Table._trans @ table.ts:68
Collection._read @ collection.ts:78
Collection.toArray @ collection.ts:208
Collection.first @ collection.ts:318
getLatestTotalsPerCategoryBefore @ ItemLog.ts:237
getLatestTotals @ ItemLogService.ts:112
exchangeSet @ MuseumService.ts:108
await in exchangeSet
ingestParsedLog @ SyncService.ts:160
await in ingestParsedLog
startGlobalSync @ SyncService.ts:105
await in startGlobalSync
handleSync @ page.tsx:103
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
page.tsx:106 DexieError {name: 'DataError', message: "Failed to execute 'bound' on 'IDBKeyRange': The pa… 'IDBKeyRange': The parameter is not a valid key.", inner: DataError: Failed to execute 'bound' on 'IDBKeyRange': The parameter is not a valid key.
    at mak…, Symbol(next.console.error.digest): 'NEXT_CONSOLE_ERROR'}
error @ intercept-console-error.ts:42
handleSync @ page.tsx:106
await in handleSync
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
