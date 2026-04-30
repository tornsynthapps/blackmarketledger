# Testing Plan

## [ItemLogService](./lib/domain/ItemLogService.ts)

### updateCostBasis

#### 1. No wrapper.

Input:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"7","1777519444667","1777519444668","1777519460736","5","1","3","969","normal","","0","0","0"
"8","1777519445090","1777519445090","1777519469719","5","1","5","963","normal","","0","0","0"
"9","1777519445427","1777519445427","1777519495740","5","1","-2","535","normal","","0","0","0"
"10","1777519446130","1777519446130","1777519509555","5","1","-8","968","normal","","0","0","0"

Action:
>> ItemLogService.updateCostBasis(1, 1777519444667)

Output:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"7","1777519444667","1777519444668","1777519598908","5","1","3","969","normal","","3","2907","0"
"8","1777519445090","1777519445090","1777519598908","5","1","5","963","normal","","8","7722","0"
"9","1777519445427","1777519445427","1777519598908","5","1","-2","535","normal","","6","5791.5","-860.5"
"10","1777519446130","1777519446130","1777519598908","5","1","-6","968","normal","3","0","0","16.5"
"11","1777519446130","1777519598907","1777519598907","5","1","-2","968","skipped","3","0","0","1936"

#### 2. Auto-split wrapper.

Input:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"12","1777520119238","1777520119238","1777520566027","5","1","5","684","normal","","1","684","0"
"13","1777520119896","1777520119896","1777520510913","5","1","9","1316","normal","","10","12528","0"
"14","1777520120150","1777520120150","1777520510913","5","1","-5","985","normal","","5","6264","-1339"
"15","1777520127146","1777520127146","1777520510913","5","1","-5","830","normal","4","0","0","-2114"
"16","1777520127146","1777520510906","1777520510906","5","1","-2","830","skipped","4","0","0","1660"

>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"4","1777520127146","1777520510893","1777520510893","1","auto-split","Automatic split: 7 total from normal overflow."

Action:
>> ItemLogService.updateCostBasis(1, 1777520119238)

Output:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"12","1777520119238","1777520119238","1777520672482","5","1","5","684","normal","","5","3420","0"
"13","1777520119896","1777520119896","1777520672482","5","1","9","1316","normal","","14","15264","0"
"14","1777520120150","1777520120150","1777520672482","5","1","-5","985","normal","","9","9812.57142857143","-526.4285714285706"
"15","1777520127146","1777520127146","1777520672482","5","1","-7","830","normal","","2","2180.5714285714284","-1822.000000000001"

>> ItemLogWrappers Table (Empty):
id,timestamp,logged_at,updated_at,version,type,description

#### 3. Normal with different category.

Input:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777521369233","5","1","5","10000","normal","","0","0","0"
"18","1777521206352","1777521206352","1777521374389","5","1","3","500","abroad","","0","0","0"
"19","1777521206528","1777521206528","1777521385794","5","1","-7","12000","normal","","0","0","0"
"22","1777521354382","1777521354382","1777521390939","5","1","-3","11000","normal","","0","0","0"

>> ItemLogWrappers Table: Empty

Action:
>> ItemLogService.updateCostBasis(1, 1777521206160)

Output:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777521463903","5","1","5","10000","normal","","5","50000","0"
"18","1777521206352","1777521206352","1777521463903","5","1","3","500","abroad","","3","1500","0"
"19","1777521206528","1777521206528","1777521463903","5","1","-5","12000","normal","5","0","0","10000"
"22","1777521354382","1777521354382","1777521463903","5","1","0","11000","normal","6","0","0","0"
"23","1777521206528","1777521463901","1777521463901","5","1","-2","12000","abroad","5","1","500","23000"
"24","1777521354382","1777521463902","1777521463902","5","1","-1","11000","abroad","6","0","0","10500"
"25","1777521354382","1777521463903","1777521463903","5","1","-2","11000","skipped","6","0","0","22000"

>>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"5","1777521206528","1777521463899","1777521463899","1","auto-split","Automatic split: 7 total from normal overflow."
"6","1777521354382","1777521463901","1777521463901","1","auto-split","Automatic split: 3 total from normal overflow."

#### 4. Normal + Abroad with added items in past.

Input:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777521604361","5","1","8","10000","normal","","5","50000","0"
"18","1777521206352","1777521206352","1777521463903","5","1","3","500","abroad","","3","1500","0"
"19","1777521206528","1777521206528","1777521463903","5","1","-5","12000","normal","5","0","0","10000"
"22","1777521354382","1777521354382","1777521463903","5","1","0","11000","normal","6","0","0","0"
"23","1777521206528","1777521463901","1777521463901","5","1","-2","12000","abroad","5","1","500","23000"
"24","1777521354382","1777521463902","1777521463902","5","1","-1","11000","abroad","6","0","0","10500"
"25","1777521354382","1777521463903","1777521463903","5","1","-2","11000","skipped","6","0","0","22000"

>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"5","1777521206528","1777521463899","1777521463899","1","auto-split","Automatic split: 7 total from normal overflow."
"6","1777521354382","1777521463901","1777521463901","1","auto-split","Automatic split: 3 total from normal overflow."

Action:
>> ItemLogService.updateCostBasis(1, 1777521206160)

Output:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777521792814","5","1","8","10000","normal","","8","80000","0"
"18","1777521206352","1777521206352","1777521792814","5","1","3","500","abroad","","3","1500","0"
"19","1777521206528","1777521206528","1777521792814","5","1","-7","12000","normal","","1","10000","14000"
"22","1777521354382","1777521354382","1777521792814","5","1","-1","11000","normal","7","0","0","1000"
"26","1777521354382","1777521792813","1777521792813","5","1","-2","11000","abroad","7","1","500","21000"

>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"7","1777521354382","1777521792812","1777521792812","1","auto-split","Automatic split: 3 total from normal overflow."

#### 5. Normal but from Abroad.

Input:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777521792814","5","1","8","10000","normal","","8","80000","0"
"18","1777521206352","1777521206352","1777521792814","5","1","3","500","abroad","","3","1500","0"
"19","1777521206528","1777521206528","1777521792814","5","1","-7","12000","normal","","1","10000","14000"
"22","1777521354382","1777521354382","1777522217370","5","1","-3","11000","abroad","7","0","0","1000"
"26","1777521354382","1777521792813","1777521792813","5","1","-2","11000","abroad","7","1","500","21000"

>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"7","1777521354382","1777521792812","1777521792812","1","auto-split","Automatic split: 3 total from normal overflow."

Action:
>> ItemLogService.updateCostBasis(1, 1777521206160)

Output:
>> ItemLogs Table:
id,timestamp,logged_at,updated_at,version,item_id,quantity,unit_price,category,wrapper_id,total_stock,total_cost,realized_profit
"17","1777521206160","1777521206160","1777522247962","5","1","8","10000","normal","","8","80000","0"
"18","1777521206352","1777521206352","1777522247962","5","1","3","500","abroad","","3","1500","0"
"19","1777521206528","1777521206528","1777522247962","5","1","-7","12000","normal","","1","10000","14000"
"22","1777521354382","1777521354382","1777522247962","5","1","-3","11000","abroad","8","0","0","31500"
"27","1777521354382","1777522247961","1777522247961","5","1","-1","11000","normal","8","0","0","1000"
"28","1777521354382","1777522247961","1777522247961","5","1","-1","11000","skipped","8","0","0","11000"

>> ItemLogWrappers Table:
id,timestamp,logged_at,updated_at,version,type,description
"8","1777521354382","1777522247960","1777522247960","1","auto-split","Automatic split: 5 total from abroad overflow."
