export const categories = [
    1, // Created account
    2, // Started introduction
    3, // Finished introduction
    101, // Successful login
    102, // Failed login
    103, // Logout
    104, // Logout all devices
    105, // Inactive refills
    106, // Development server accessed
    110, // Password reset requested
    111, // Password reset successful
    120, // 2FA SMS code sent
    121, // 2FA SMS code entry successful
    122, // 2FA SMS code entry failed
    123, // 2FA Secret question entry successful
    124, // 2FA Secret question entry failed
    125, // 2FA Email code sent
    126, // 2FA Email code entry successful
    127, // 2FA Email code entry failed
    130, // 2FA Authenticator code entry successful
    131, // 2FA Authenticator code entry failed
    300, // Name change
    301, // Email change
    302, // Email validate
    303, // Password change success
    304, // Password change failed
    305, // Gender change
    310, // Security panel entry success
    311, // Security panel entry failure
    312, // 2FA enable/disable
    313, // Authorised device add/remove
    314, // Mobile number add/remove/verified
    315, // Date of birth add/remove
    316, // Secret question add/remove
    317, // Authenticator add/remove/verified
    320, // Login widgets enable/disable
    321, // Honor names enable/disable
    322, // Preferred validation
    323, // Revive preference
    324, // Revive preference automatic
    325, // Attack & defending preferences
    330, // Icon placement
    331, // Icon order
    332, // Icon size
    333, // Icon refresh
    340, // Resend seasonal newsletter
    341, // Email subscriptions
    345, // API key reset (deprecated)
    346, // API key add
    347, // API key delete
    348, // API key pause/unpause
    350, // Profile signature
    351, // Profile signature viewing preference
    355, // Forum signature
    356, // Forum signature viewing preference
    360, // Personal details display preference
    361, // Personal details real name change
    362, // Personal details country change
    363, // Personal details city change
    364, // Personal details age change
    370, // Gallery image upload
    371, // Gallery image edit type
    372, // Gallery image add description
    373, // Gallery image delete
    374, // Gallery profile image change
    375, // Gallery profile image remove
    381, // Staff gallery image delete receive
    400, // Seasonal newsletter send
    401, // Seasonal newsletter energy bonus
    402, // Seasonal newsletter nerve bonus
    410, // Inactive update send
    420, // George tutorial send
    500, // Captcha validation success
    501, // Captcha validation failure
    510, // Discord verification
    1100, // Item market add (old)
    1101, // Item market remove (old)
    1102, // Item market edit (old)
    // 1103, // Item market buy (old)
    // 1104, // Item market sell (old)
    1110, // Item market add
    1111, // Item market remove
    // 1112, // Item market buy
    // 1113, // Item market sell
    1115, // Item market price edit
    1116, // Item market anonymity edit
    1200, // Bazaar name change
    1201, // Bazaar description change
    1202, // Bazaar open / close
    1205, // Bazaar favorite
    1206, // Bazaar unfavorite
    1210, // Bazaar add (legacy)
    1211, // Bazaar remove (legacy)
    1212, // Bazaar edit (legacy)
    // 1220, // Bazaar buy (legacy)
    // 1221, // Bazaar sell (legacy)
    1222, // Bazaar add
    1223, // Bazaar remove
    1224, // Bazaar edit
    // 1225, // Bazaar buy
    // 1226, // Bazaar sell
    1300, // Display add (legacy)
    1301, // Display remove (legacy)
    1302, // Display add
    1303, // Display remove
    // 1400, // Dump add (legacy)
    // 1401, // Dump find (legacy)
    1402, // Dump find none
    1403, // Dump add
    1404, // Dump find
    1500, // Big Al's bunker sell
    1501, // Big Al's bunker buy
    2010, // Item use entertainment
    2020, // Item use candy
    2030, // Item use alcohol
    2040, // Item use energy drink
    2050, // Item use book
    2051, // Item finish book
    2052, // Item finish book strength increase
    2053, // Item finish book speed increase
    2054, // Item finish book defense increase
    2055, // Item finish book dexterity increase
    2056, // Item finish book working stats increase
    2057, // Item finish book list capacity increase
    2058, // Item finish book merit reset
    2059, // Item finish book drug addiction removal
    2060, // Item use morphine
    2070, // Item use first aid kit
    2080, // Item use small first aid kit
    2090, // Item use neumune tablet
    2100, // Item use blood bag
    2101, // Item use blood bag wrong type
    2102, // Item use blood bag irradiated
    2105, // Item use ipecac syrup
    2110, // Item use lawyer business card
    2120, // Item use parachute
    2130, // Item use skateboard
    2140, // Item use boxing gloves
    2150, // Item use dumbbells
    2160, // Item use book of carols
    2170, // Item use gift card
    2180, // Item use erotic dvd
    2190, // Item use feathery hotel coupon
    2200, // Item use cannabis
    2201, // Item use cannabis overdose
    2210, // Item use ecstasy
    2211, // Item use ecstasy overdose
    2220, // Item use ketamine
    2221, // Item use ketamine overdose
    2230, // Item use LSD
    2231, // Item use LSD overdose
    2240, // Item use opium
    2241, // Item use opium overdose
    2250, // Item use PCP
    2251, // Item use PCP overdose
    2260, // Item use shrooms
    2261, // Item use shrooms overdose
    2270, // Item use speed
    2271, // Item use speed overdose
    2280, // Item use vicodin
    2281, // Item use vicodin overdose
    2290, // Item use xanax
    2291, // Item use xanax overdose
    2295, // Item use love juice
    2300, // Item use dog poop success
    2301, // Item use dog poop fail
    2302, // Item target dog poop success
    2303, // Item target dog poop fail
    2310, // Item use stink bombs success
    2311, // Item use stink bombs fail
    2312, // Item target stink bombs success
    2313, // Item target stink bombs fail
    2320, // Item use toilet paper success
    2321, // Item use toilet paper fail
    2322, // Item target toilet paper success
    2323, // Item target toilet paper fail
    2325, // Item use poison mistletoe
    2326, // Item target poison mistletoe
    2330, // Item use donator pack
    2340, // Item use empty blood bag
    2350, // Item use box of grenades
    2360, // Item use box of medical supplies
    2370, // Item use lottery voucher
    2380, // Item use piggy bank deposit
    2381, // Item use piggy bank withdraw
    2390, // Item use drug pack
    2400, // Item use goodie bag
    2405, // Item use wallet
    2406, // Item use arca fortunae
    2407, // Item use stash box
    2410, // Item use box of tissues
    2420, // Item use vanity mirror
    2430, // Item use casino pass
    2440, // Item use dirty bomb
    2441, // Item use dirty bomb prime
    2442, // Item use dirty bomb safe
    2443, // Dirty bomb radiation
    2444, // Dirty bomb hospitalize
    2445, // Dirty bomb claim responsibility
    2450, // Item use cake frosting / lock picking kit
    2460, // Item use felovax
    2470, // Item use zylkene
    2480, // Item use dukes safe
    2490, // Item use empty vial
    2500, // Item use keg of beer
    2501, // Item use keg of beer empty
    2510, // Item use six pack of alcohol
    2520, // Item use six pack of energy drink
    2525, // Item use tin of treats
    2530, // Item use halloween basket take candy (legacy)
    2531, // Item use halloween basket decrease happiness (legacy)
    2532, // Item target halloween basket take candy (legacy)
    2533, // Item target halloween basket decrease happiness (legacy)
    2535, // Item use halloween basket
    2536, // Halloween treat receive
    2538, // Halloween basket evolution
    2540, // Halloween basket upgrade
    2545, // Halloween basket receive happy
    2546, // Halloween basket receive nerve
    2547, // Halloween basket receive energy
    2548, // Halloween basket receive item
    2600, // Item use strippogram
    2601, // Item target strippogram
    2605, // Item use anniversary present
    2610, // Item use christmas cracker user win
    2611, // Item use christmas cracker target win
    2612, // Item use christmas cracker user lose
    2613, // Item use christmas cracker target lose
    2615, // Item use cache
    2620, // Item use relic
    2621, // Relic wither
    4000, // Parcel create
    4001, // Parcel open
    4002, // Parcel wrap
    4003, // Parcel disguise
    4005, // Parcel open small explosive device
    4006, // Parcel open horses head
    4100, // Item send (legacy)
    4101, // Item receive (legacy)
    4102, // Item send
    4103, // Item receive
    4104, // Item send (legacy 2)
    4105, // Item receive (legacy 2)
    // 4200, // Item shop buy
    // 4201, // Item abroad buy
    // 4210, // Item shop sell
    4220, // Item shop sell points
    4300, // Auction house item add
    4301, // Auction house property add
    4305, // Auction house item bid fail
    4306, // Auction house property bid fail
    4310, // Auction house item bid
    4311, // Auction house property bid
    4312, // Auction house item outbid
    4313, // Auction house property outbid
    4320, // Auction house item win
    4321, // Auction house property win
    4322, // Auction house item sold
    4323, // Auction house property sold
    4330, // Auction house item timeout
    4331, // Auction house property timeout
    4400, // Trade initiate outgoing
    4401, // Trade initiate incoming
    4410, // Trade cancel outgoing
    4411, // Trade cancel incoming
    4412, // Trade decline outgoing
    4413, // Trade decline incoming
    4420, // Trade expire
    4430, // Trade completed
    4431, // Trade accepted
    4440, // Trade money outgoing
    4441, // Trade money incoming
    4442, // Trade money add
    4443, // Trade money remove
    4445, // Trade items outgoing
    4446, // Trade items incoming
    4447, // Trade items add
    4448, // Trade items remove
    4450, // Trade property outgoing
    4451, // Trade property incoming
    4452, // Trade property add
    4453, // Trade property remove (legacy)
    4454, // Trade property remove
    4455, // Trade shares outgoing (legacy)
    4456, // Trade shares incoming (legacy)
    4457, // Trade shares add (legacy)
    4458, // Trade shares remove (legacy)
    4460, // Trade NAPs (legacy)
    4465, // Trade peace treaties
    4466, // Trade peace treaties add
    4467, // Trade peace treaties remove
    4470, // Trade faction outgoing
    4471, // Trade faction incoming
    4472, // Trade faction add
    4473, // Trade faction remove
    4475, // Trade company outgoing
    4476, // Trade company incoming
    4477, // Trade company add
    4478, // Trade company remove
    4480, // Trade money add other user
    4481, // Trade money remove other user
    4482, // Trade items add other user
    4483, // Trade items remove other user
    4484, // Trade property add other user
    4485, // Trade property remove other user (legacy)
    4486, // Trade shares add other user (legacy)
    4487, // Trade shares remove other user (legacy)
    4488, // Trade peace treaties add other user
    4489, // Trade peace treaties remove other user
    4490, // Trade faction add other user
    4491, // Trade faction remove other user
    4492, // Trade company add other user
    4493, // Trade company remove other user
    4494, // Trade property remove other user
    4498, // Trade comment
    4499, // Trade comment other user
    4500, // Ammo buy
    4510, // Ammo sell
    4520, // Ammo priority
    4600, // Mods equip
    4610, // Mods unequip
    4700, // Items equip
    4710, // Items unequip
    4750, // Loadout switch
    4751, // Loadout rename
    4752, // Loadout reset
    4800, // Money send
    4810, // Money receive
    4850, // Keepsake purchase
    4900, // Points energy refill use
    4905, // Points nerve refill use
    4910, // Points casino token refill use
    4915, // Points stock ticker unlock
    4920, // Points friend capacity increase
    4925, // Points enemy capacity increase
    4926, // Points target capacity increase
    4927, // Points loadout capacity increase
    4930, // Points racing license unlock
    4935, // Points city watch unlock
    4940, // Points display case unlock
    4945, // Points bazaar unlock
    4950, // Points merit buy
    4955, // Points merit reset use
    4960, // Points Big Al's bunker unlock
    4965, // Points honor unlock
    4970, // Points hairstyle unlock
    4975, // Points backdrop unlock
    4976, // Points hairstyle equip
    4977, // Points hairstyle unequip
    4978, // Points backdrop change
    5000, // Points market add
    5001, // Points market remove
    // 5010, // Points market buy
    // 5011, // Points market sell
    5100, // Merit assign
    5110, // Honor awarded
    5120, // Medal awarded
    5130, // Rank change
    5140, // Title change
    5150, // Honor bar changed
    5200, // Level up
    5250, // Referral signup
    5251, // Referral reward
    5252, // Referral remove
    5300, // Gym train strength
    5301, // Gym train defense
    5302, // Gym train speed
    5303, // Gym train dexterity
    5310, // Gym train addict
    5320, // Gym purchase
    5321, // Gym activate
    5350, // Jail
    5351, // Jail escape success
    5352, // Jail escape failure
    5355, // Jail escape fruitcake
    5356, // Jail fruitcake
    5360, // Bust success
    5361, // Bust receive success
    5362, // Bust failure
    5363, // Bust receive failure
    5370, // Bail
    5371, // Bail receive
    5400, // Hospital
    5410, // Revive
    5411, // Revive receive
    5412, // Reviving skill level up
    5415, // Revive failure
    5416, // Revive receive failure
    5420, // Early discharge
    5450, // Bank invest
    5451, // Bank withdraw
    5460, // Cashiers check withdraw
    5461, // Cashiers check receive
    5500, // Stock listing add (legacy)
    5501, // Stock listing remove (legacy)
    5510, // Stock buy
    5511, // Stock sell
    5520, // Stock split
    5521, // Stock merge
    5530, // Stock special item
    5531, // Stock special money
    5532, // Stock special property
    5533, // Stock special ammo
    5534, // Stock special happy
    5535, // Stock special energy
    5536, // Stock special nerve
    5537, // Stock special points
    5544, // Stock special withdrawal ready
    5545, // Stock special passive active
    5550, // Donation success
    5551, // Donation success bonus points
    5555, // Subscription success
    5560, // Subscription created
    5561, // Subscription canceled
    5562, // Subscription suspended
    5563, // Subscription reactivated
    5565, // Donation failure
    5570, // Donation expired
    5575, // Subscription reward
    5580, // Subscription draw
    5585, // Donation staff privilege
    5600, // Seasonal gift items
    5610, // Seasonal gift energy
    5611, // Seasonal gift refills
    5615, // Seasonal gift merit reset
    5700, // Crime fail
    5705, // Crime fail jail
    5710, // Crime fail hospital
    5715, // Crime fail money loss
    5720, // Crime success money gain
    // 5725, // Crime success item gain
    5730, // Crime success points gain
    5735, // Crime success casino token gain
    5750, // Friends list add
    5751, // Friends list remove
    5752, // Friends list description
    5753, // Friends list add automatic
    5755, // Enemies list add
    5756, // Enemies list remove
    5757, // Enemies list description
    5758, // Enemies list exchanges
    5760, // Targets list add
    5761, // Targets list remove
    5762, // Targets list description
    5770, // Recently met list remove
    5800, // Virus programming start
    5801, // Virus programming cancel
    5802, // Virus programming complete
    5850, // Vault deposit
    5851, // Vault withdraw
    5852, // Vault sharing
    5900, // Property upgrade
    5905, // Property staff
    5910, // Property move
    5915, // Property kick
    5916, // Property kick receive
    5920, // Property upkeep
    5925, // Property sell market add
    5926, // Property sell market remove
    5927, // Property buy
    5928, // Property sell
    5930, // Property rental market add
    5931, // Property rental market remove
    5932, // Property rental market offer owner
    5933, // Property rental market offer renter
    5934, // Property rental market offer remove owner
    5935, // Property rental market offer remove renter
    5936, // Property rental market rent renter
    5937, // Property rental market rent owner
    5938, // Property rental market rent expire renter
    5939, // Property rental market rent expire owner
    5940, // Property rental market extension owner
    5941, // Property rental market extension renter
    5942, // Property rental market extension accept renter
    5943, // Property rental market extension accept owner
    5945, // Property give
    5946, // Property receive
    5947, // Property rental market offer decline renter
    5948, // Property rental market offer decline owner
    5950, // Property rental market extension decline renter
    5951, // Property rental market extension decline owner
    5952, // Property rental market extension withdraw renter
    5953, // Property rental market extension withdraw owner
    5960, // Education start
    5961, // Education leave
    5962, // Education kick
    5963, // Education complete
    5970, // Church donate
    5971, // Church pray
    5975, // Church propose send
    5976, // Church propose receive
    5977, // Church propose cancel send
    5978, // Church propose cancel receive
    5979, // Church propose decline send
    5980, // Church propose decline receive
    5981, // Church propose accept send
    5982, // Church propose accept receive
    5983, // Church propose break send
    5984, // Church propose break receive
    5985, // Church invite guest send
    5986, // Church invite guest receive
    5987, // Church guest accept send
    5988, // Church guest accept receive
    5989, // Church marry
    5990, // Church divorce send
    5991, // Church divorce receive
    5992, // Church guest witness
    6000, // Travel initiate
    6001, // Travel fee
    6002, // Travel business class ticket
    6005, // Rehab
    6010, // Offshore bank deposit
    6011, // Offshore bank withdraw
    6012, // Offshore bank interest
    6015, // Fortune teller
    6020, // Hunting
    6021, // Hunting skill level up
    6200, // Loan increase
    6201, // Loan decrease
    6203, // Loan fees increase
    6204, // Loan fees pay
    6205, // Loan warning
    6206, // Loan increase upkeep
    6210, // Job join
    6211, // Job interview failure
    6212, // Job interview angry
    6215, // Job promote
    6216, // Job quit
    6217, // Job fired
    6220, // Job pay
    6221, // Company employee pay
    6222, // Company director pay
    6235, // Faction looking for members toggle
    6236, // Faction allow applications toggle
    6237, // Company allow applications toggle
    6240, // Company application send
    6241, // Company application delete
    6242, // Company application accept send
    6243, // Company application accept receive
    6244, // Company application decline send
    6245, // Company application decline receive
    6250, // Faction application send
    6251, // Faction application delete
    6252, // Faction application accept send
    6253, // Faction application accept receive
    6254, // Faction application decline send
    6255, // Faction application decline receive
    6260, // Company quit
    6261, // Company fire send
    6262, // Company fire receive
    6263, // Company train send
    6264, // Company train receive
    6265, // Company wage change send
    6266, // Company wage change receive
    6267, // Company rank change send
    6268, // Company rank change receive
    6275, // Company fire bankruptcy
    6280, // Company create
    6281, // Company stock pricing
    6282, // Company stock order
    6283, // Company advertising budget
    6284, // Company deposit
    6285, // Company withdraw
    6290, // Company storage upgrade
    6291, // Company staffroom upgrade
    6292, // Company size upgrade
    6293, // Company name change
    6294, // Company director change send
    6295, // Company director change receive
    6296, // Company image upload
    6300, // Company sell
    6301, // Company newsletter send
    6302, // Company newsletter receive
    6310, // Company news save
    6311, // Company news unsave
    6400, // Job special gain strength
    6401, // Job special gain item
    6402, // Job special gain defense
    6403, // Job special spy
    6404, // Job special gain money
    6405, // Job special gain casino tokens
    6406, // Job special gain nerve
    6407, // Job special class action lawsuit
    6408, // Job special give jail bail
    6409, // Job special receive jail bail
    6410, // Job special gain working stats
    6500, // Company special gain special ammo
    6501, // Company special gain exp
    6502, // Company special view target info
    6503, // Company special reduce education time
    6504, // Company special reduce drug addiction
    6505, // Company special gain item
    6506, // Company special view abroad stocks
    6507, // Company special gain racing points
    6508, // Company special gain endurance
    6509, // Company special gain money
    6510, // Company special view level progress
    6511, // Company special gain energy
    6512, // Company special gain nerve
    6513, // Company special gain happy
    6514, // Company special gain energy nerve and happy
    6515, // Company special view true level
    6516, // Company special cancel virus
    6517, // Company special view bounties
    6518, // Company special view bank investment
    6519, // Company special guarantee stealth
    6520, // Company special receive cancel virus
    6521, // Company special gain casino tokens
    6522, // Company special gain respect
    6523, // Company special gain working stats
    6524, // Company special gain credit score
    6550, // Company special gain loan time
    6525, // Company special gain items
    6526, // Company special gain strength
    6527, // Company special gain speed
    6528, // Company special gain dexterity
    6529, // Company special gain defense
    6530, // Company special gain racing skill
    6531, // Company special gain crime experience
    6532, // Company special view city items
    6533, // Company special gain property
    6534, // Company special use embargo
    6535, // Company special receive embargo
    6536, // Company special reduce bank time
    6537, // Company special use free ride
    6538, // Company special receive free ride
    6539, // Company special use intricate hack
    6540, // Company special view company details
    6541, // Company special block bounties
    6542, // Company special gain mission credits
    6543, // Company special gain life boost
    6544, // Company special view employment and faction history
    6545, // Company special view friends / enemies list
    6546, // Company special use watchlist
    6547, // Company special receive watchlist
    6548, // Company special view most wanted
    6549, // Company special use logistics report
    6700, // Bounty place
    6701, // Bounty place receive
    6705, // Bounty expire
    6706, // Bounty expire receive
    6708, // Bounty refund
    6710, // Bounty claim
    6711, // Bounty claim lister
    6712, // Bounty claim target
    6720, // Faction leave
    6721, // Faction kick send
    6722, // Faction kick receive
    6723, // Faction kick destroyed
    6725, // Faction deposit item (legacy)
    6726, // Faction deposit money
    6727, // Faction deposit points
    6728, // Faction deposit item
    6730, // Faction give item send (legacy)
    6731, // Faction give item receive (legacy)
    6732, // Faction give item send
    6733, // Faction give item receive
    6735, // Faction give money send
    6736, // Faction give money receive
    6737, // Faction money balance change send
    6738, // Faction money balance change receive
    6740, // Faction give points send
    6741, // Faction give points receive
    6742, // Faction points balance change send
    6743, // Faction points balance change receive
    6745, // Faction loan item send
    6746, // Faction loan item receive
    6747, // Faction loan item return
    6748, // Faction loan item retrieve send
    6749, // Faction loan item retrieve receive
    6750, // Faction loan item take ownership
    6751, // Faction loan item receive ownership
    6752, // Faction item receive ownership (legacy)
    6753, // Faction item receive ownership
    6754, // Faction money receive ownership
    6755, // Faction points receive ownership
    6760, // Faction tree upgrade set
    6761, // Faction tree upgrade unset
    6762, // Faction tree upgrade restore
    6763, // Faction tree upgrade unset entire branch
    6764, // Faction tree upgrade restore entire branch
    6765, // Faction tree branch select
    6766, // Faction tree war mode
    6767, // Faction tree optimize
    6768, // Faction organized crimes use items
    6769, // Faction organized crimes lose items
    6770, // Faction organized crimes join
    6771, // Faction organized crimes leave
    6772, // Faction organized crimes remove
    6773, // Faction organized crimes remove receive
    6774, // Faction organized crimes success
    6775, // Faction organized crimes failure
    6776, // Faction organized crimes failure jail
    6777, // Faction organized crimes failure hospital
    6778, // Faction organized crimes failure injury
    6779, // Faction organized crimes spawn
    6780, // Faction organized crimes plan
    6781, // Faction organized crimes plan receive
    6782, // Faction organized crimes success jail
    6783, // Faction organized crimes success hospital
    6784, // Faction organized crimes success injury
    6785, // Faction organized crimes cancel
    6786, // Faction organized crimes cancel receive
    6790, // Faction organized crimes initiate
    6791, // Faction organized crimes initiate receive
    6792, // Faction payout money send
    6793, // Faction payout money receive
    6794, // Faction payout money balance send
    6795, // Faction payout money balance receive
    6796, // Faction payout item send
    6797, // Faction payout item receive
    6799, // Faction organized crimes radiation sickness receive
    6800, // Faction create
    6805, // Faction newsletter send
    6806, // Faction newsletter receive
    6810, // Faction payday give
    6811, // Faction payday receive
    6815, // Faction permissions change (legacy)
    6816, // Faction permissions change receive (legacy)
    6818, // Faction position create
    6819, // Faction position delete
    6820, // Faction position name change
    6821, // Faction position permission toggle
    6825, // Faction member position change
    6826, // Faction member position change receive
    6827, // Faction member position auto change receive
    6830, // Faction change leader
    6831, // Faction change leader receive
    6832, // Faction change leader auto receive
    6833, // Faction change leader auto remove
    6835, // Faction change coleader
    6836, // Faction change coleader noone (legacy)
    6837, // Faction change coleader remove
    6838, // Faction change coleader receive
    6845, // Faction change announcement
    6850, // Faction change urgent announcement
    6851, // Faction remove urgent announcement
    6852, // Faction change important announcement
    6853, // Faction remove important announcement
    6855, // Faction change description
    6860, // Faction change name
    6863, // Faction image upload
    6865, // Faction change tag
    6866, // Faction change tag image
    6869, // Organized crimes system migration
    6870, // Faction delete
    6875, // Faction build dirty bomb
    6876, // Faction complete dirty bomb
    6900, // Faction raid initiate
    6901, // Faction raid cease
    6902, // Faction raid surrender
    6910, // Faction territory initiate
    6914, // Faction territory wall join energy cost
    6915, // Faction territory wall join
    6916, // Faction territory wall remove
    6950, // Faction ranked warring enlist
    6951, // Faction ranked warring unenlist
    6955, // Faction ranked warring scheduling preference
    6970, // Faction news save
    6971, // Faction news unsave
    // 7000, // Museum exchange
    // 7011, // City item find
    7050, // Article create
    7051, // Article edit
    7052, // Article edit receive
    7053, // Article publish
    7054, // Article publish receive
    7055, // Article points reward
    7056, // Article delete
    7057, // Article delete receive
    7058, // Article restore
    7059, // Article restore receive
    7060, // Article comment
    7061, // Article comment receive
    7062, // Article unpublish
    7063, // Article unpublish receive
    7070, // Tell your story submit
    7071, // Tell your story delete
    7072, // Tell your story restore
    7080, // Headline create
    7081, // Headline delete
    7082, // Headline restore
    7090, // Reporter add
    7091, // Reporter add receive
    7092, // Reporter remove
    7093, // Reporter remove receive
    7100, // Classified advert add
    7110, // Image advert add
    7115, // Image advert decline send
    7116, // Image advert decline receive
    7120, // Image advert accept send
    7121, // Image advert accept receive
    7125, // Image advert refund
    7126, // Image advert remove send
    7127, // Image advert remove receive
    7130, // Comic submit
    7131, // Comic decline send
    7132, // Comic decline receive
    7133, // Comic accept send
    7134, // Comic accept receive
    7135, // Comic remove send
    7136, // Comic remove receive
    7140, // Personals add
    7141, // Personals remove send
    7142, // Personals remove receive
    7150, // Ignore list add
    7151, // Ignore list remove
    7200, // Message send
    7201, // Message receive
    7205, // Message read
    7210, // Message delete
    7215, // Message save
    7216, // Message save delete
    7217, // Message unsave
    7300, // Event delete (legacy)
    7301, // Event send (legacy)
    7302, // Event receive (legacy)
    7305, // Event receive delete (legacy)
    7310, // Event save (legacy)
    7311, // Event save delete (legacy)
    7320, // Event send
    7321, // Event receive
    7322, // Event save
    7323, // Event unsave
    7400, // Forums create thread
    7401, // Forums create post
    7410, // Forums edit own post
    7411, // Forums edit user post
    7412, // Forums edit user post receive
    7420, // Forums rate
    7430, // Forums pin
    7431, // Forums pin receive
    7435, // Forums sticky
    7436, // Forums sticky receive
    7440, // Forums lock
    7441, // Forums lock receive
    7445, // Forums delete
    7446, // Forums delete receive
    7450, // Forums move
    7451, // Forums move receive
    7455, // Forums poll vote
    7456, // Forums poll opt out
    7460, // Forums subscribe
    7465, // Forums report
    7466, // Forums report delete
    7500, // Forums bug report assign send
    7501, // Forums bug report unassign
    7502, // Forums bug report assign receive
    7505, // Forums bug report status
    7506, // Forums bug report status receive
    7700, // Staff rating
    7800, // Missions accept
    7805, // Missions decline
    7810, // Missions fail
    7815, // Missions complete
    7850, // Missions receive energy
    7851, // Missions receive nerve
    7900, // Missions buy reward item
    7905, // Missions buy reward ammo
    7910, // Missions buy reward mod
    8000, // Account close
    8001, // Account reopen
    8005, // Account delete
    8007, // Staff account delete receive
    8010, // Account recovery success
    8011, // Account recovery failure
    8100, // Attack lost
    8101, // Attack lost receive
    8105, // Attack stalemate
    8106, // Attack stalemate receive
    8110, // Attack timeout
    8111, // Attack timeout receive
    8115, // Attack escape
    8116, // Attack escape receive
    8140, // Attack failed
    8141, // Attack failed receive
    8145, // Attack assist
    8150, // Attack leave
    8151, // Attack leave receive
    8155, // Attack mug
    // 8156, // Attack mug receive
    8160, // Attack hospitalize
    8161, // Attack hospitalize receive
    8165, // Attack arrest
    8166, // Attack arrest receive
    8170, // Attack receive loot
    8180, // Attack radiation sickness receive
    8300, // Casino slots win
    8301, // Casino slots lose
    8305, // Casino roulette win
    8306, // Casino roulette lose
    8310, // Casino high-low start
    8311, // Casino high-low lose
    8312, // Casino high-low draw
    8313, // Casino high-low win
    8314, // Casino high-low cash in full
    8315, // Casino high-low cash in half
    8320, // Casino keno win
    8321, // Casino keno lose
    8330, // Casino craps bet
    8331, // Casino craps win
    8332, // Casino craps lose
    8340, // Casino lottery bet
    8341, // Casino lottery win
    8350, // Casino blackjack start
    8351, // Casino blackjack hit
    8352, // Casino blackjack double down
    8353, // Casino blackjack split
    8354, // Casino blackjack lose
    8355, // Casino blackjack win
    8356, // Casino blackjack insurance lose
    8357, // Casino blackjack insurance win
    8358, // Casino blackjack push
    8359, // Casino blackjack surrender
    8370, // Casino spin the wheel start
    8371, // Casino spin the wheel free spin
    8372, // Casino spin the wheel lose
    8373, // Casino spin the wheel hospital
    8374, // Casino spin the wheel win money
    8375, // Casino spin the wheel win points
    8376, // Casino spin the wheel win casino tokens
    8377, // Casino spin the wheel win item
    8378, // Casino spin the wheel win property
    8379, // Casino spin the wheel honor bar
    8390, // Casino russian roulette start
    8391, // Casino russian roulette join
    8392, // Casino russian roulette opponent join
    8393, // Casino russian roulette result
    8394, // Casino russian roulette opponent result
    8395, // Casino russian roulette win
    8396, // Casino russian roulette lose
    8397, // Casino russian roulette timeout
    8398, // Casino russian roulette opponent timeout
    8399, // Casino russian roulette timeout refund
    8400, // Casino russian roulette leave
    8410, // Casino poker table join
    8411, // Casino poker table leave
    8412, // Casino poker tournament register
    8413, // Casino poker tournament unregister
    8415, // Casino poker small blind
    8416, // Casino poker big blind
    8417, // Casino poker tournament small blind
    8418, // Casino poker tournament big blind
    8425, // Casino poker check
    8426, // Casino poker fold
    8427, // Casino poker call
    8428, // Casino poker bet
    8429, // Casino poker raise
    8430, // Casino poker tournament check
    8431, // Casino poker tournament fold
    8432, // Casino poker tournament call
    8433, // Casino poker tournament bet
    8434, // Casino poker tournament raise
    8435, // Casino poker win
    8436, // Casino poker lose
    8437, // Casino poker timeout
    8440, // Casino poker sit out
    8441, // Casino poker sit in
    8442, // Casino poker tournament win
    8443, // Casino poker tournament lose
    8444, // Casino poker tournament winnings
    8445, // Casino poker tournament eliminated
    8450, // Bookie bet
    8451, // Bookie lose
    8452, // Bookie win
    8453, // Bookie refund
    8455, // Bookie withdraw
    8460, // Bookie bet (new)
    8461, // Bookie lose (new)
    8462, // Bookie win (new)
    8463, // Bookie refund (new)
    8465, // Bookie withdraw (new)
    8690, // Gambling self-exclusion
    8700, // Racing enlist car
    8701, // Racing unenlist car
    8702, // Racing rename car
    8705, // Racing upgrade car
    8706, // Racing remove upgrade
    8710, // Racing create custom race
    8711, // Racing join custom race
    8715, // Racing join official race
    8720, // Racing leave custom race
    8721, // Racing leave official race
    8722, // Racing race timeout
    8725, // Racing change car
    8730, // Racing finish custom race
    8731, // Racing finish official race
    8732, // Racing skill level up
    8733, // Racing personal best
    8735, // Racing crash
    8740, // Racing pay join fee
    8741, // Racing receive refund
    8742, // Racing receive winnings
    8745, // Racing class increase
    8800, // Token shop honor
    8801, // Token shop hairstyle unlock
    8802, // Token shop backdrop unlock
    8803, // Token shop hairstyle equip
    8804, // Token shop backdrop change
    8805, // Token shop hairstyle unequip
    8820, // Report send
    8822, // Report reply
    8840, // Energy maximum increase
    8841, // Energy maximum decrease
    8842, // Nerve maximum increase
    8843, // Nerve maximum decrease
    8844, // Happy maximum increase
    8845, // Happy maximum decrease
    8846, // Life maximum increase
    8847, // Life maximum decrease
    8850, // Event start time change
    8855, // Community event prize
    8860, // Mr & Ms Torn submit image (legacy)
    8861, // Mr & Ms Torn withdraw image (legacy)
    8864, // Mr & Ms Torn decline send (legacy)
    8865, // Mr & Ms Torn decline receive (legacy)
    8866, // Mr & Ms Torn remove send (legacy)
    8867, // Mr & Ms Torn remove receive (legacy)
    8868, // Mr & Ms Torn accept send (legacy)
    8869, // Mr & Ms Torn accept receive (legacy)
    8874, // Mr & Ms Torn vote (legacy)
    8875, // Mr & Ms Torn results (legacy)
    8876, // Mr & Ms Torn points receive (legacy)
    8877, // Mr & Ms Torn crown receive (legacy)
    8880, // Elimination team join
    8881, // Elimination team leave
    8882, // Elimination team eliminated
    8885, // Elimination results
    8886, // Elimination enter candidacy
    8887, // Elimination withdraw candidacy
    8888, // Elimination leader vote
    8889, // Elimination leader elected
    8890, // Elimination newsletter send
    8891, // Elimination newsletter receive
    8892, // Elimination vice-captain appoint
    8893, // Elimination vice-captain appoint receive
    8894, // Elimination vice-captain remove
    8895, // Elimination vice-captain remove receive
    8900, // Dog tags steal (legacy)
    8901, // Dog tags lose (legacy)
    8902, // Dog tags return send (legacy)
    8903, // Dog tags return receive (legacy)
    8904, // Dog tags results (legacy)
    8920, // Anniversary cake t
    8921, // Anniversary cake o
    8922, // Anniversary cake r
    8923, // Anniversary cake n
    8930, // Christmas town find item
    8931, // Christmas town find key
    8932, // Christmas town chest open (legacy)
    8933, // Christmas town reward (legacy)
    8934, // Christmas town purchase item
    8935, // Christmas town purchase ornament
    8936, // Christmas town pot deposit item
    8937, // Christmas town ornament (deprecated)
    // 8938, // Christmas town items
    8939, // Christmas town bucks
    8940, // Christmas town money
    8941, // Christmas town ornament
    8942, // Christmas town hat
    8945, // Christmas town coupon receive
    8946, // Christmas town coupon exchange
    8960, // Easter egg hunt pickup blue egg (legacy)
    8961, // Easter egg hunt pickup green egg (legacy)
    8962, // Easter egg hunt pickup red egg (legacy)
    8963, // Easter egg hunt pickup yellow egg (legacy)
    8964, // Easter egg hunt pickup white egg (legacy)
    8965, // Easter egg hunt pickup black egg (legacy)
    8966, // Easter egg hunt pickup brown egg (legacy)
    8967, // Easter egg hunt pickup orange egg (legacy)
    8968, // Easter egg hunt pickup pink egg (legacy)
    8969, // Easter egg hunt pickup purple egg (legacy)
    8977, // Easter egg hunt exchange (legacy)
    8978, // Easter egg hunt results (legacy)
    8980, // Easter egg hunt pickup egg
    8981, // Item use green easter egg
    8982, // Item use red easter egg
    8983, // Item use yellow easter egg
    8984, // Item use purple easter egg
    8985, // Item use black easter egg
    8986, // Item use blue easter egg
    8987, // Item use white easter egg
    8988, // Item use brown easter egg
    8989, // Item use gold easter egg
    9000, // Crime system migration
    9005, // Crime skill level up
    9006, // Crime skill level down
    9010, // Crime success
    9015, // Crime success money gain (new)
    // 9020, // Crime success item gain (new)
    9025, // Crime success points gain (new)
    9027, // Crime success ammo gain
    9030, // Crime success money paid
    9050, // Crime success bootlegging copy DVDs
    9051, // Crime success bootlegging online store
    9052, // Crime success bootlegging sell DVDs
    9053, // Crime success bootlegging online store money paid
    9055, // Crime success skimming collect card details
    9056, // Crime success skimming sell card details
    9060, // Crime success burglary scout target
    9065, // Crime success unlock
    9070, // Crime success scamming farm emails
    9071, // Crime success scamming farm emails money paid
    9072, // Crime success scamming farm emails initiate phishing website
    9073, // Crime success scamming farm emails initiate website scraper
    9150, // Crime fail (new)
    9154, // Crime critical fail
    9155, // Crime critical fail jail
    9158, // Crime critical fail injury
    9160, // Crime critical fail hospital
    9163, // Crime critical fail item loss
    9165, // Crime critical fail money loss
    9190, // Crime critical fail lose card details
    9191, // Crime critical fail lose online store
    9300, // Crime item add blank DVDs
    9301, // Crime item add spray can
    9302, // Crime use items for skimming
    9303, // Crime item retrieve spy camera and card skimmer
    9304, // Crime use items for disposal
    9305, // Crime item add component
    9306, // Crime item remove component
    9307, // Crime cracking character guess
    9308, // Crime bootlegging online store toggle
    9309, // Crime item add for forgery
    9310, // Crime use items for forgery
    9350, // Crime graffiti reputation up
    9351, // Crime graffiti reputation down
    9356, // Crime scamming read email
    9360, // Crime arson inquire
    9361, // Crime use items for arson
    9362, // Crime unlock item for arson
    15001, // Staff donation status change receive
    15021, // Staff items remove receive
    15031, // Staff money remove receive
    15035, // Staff check credit receive
    15037, // Staff church fund check credit receive
    15041, // Staff points remove receive
    15043, // Staff points credit receive
    15051, // Staff donator days remove receive
    15061, // Staff special refills credit receive
    15071, // Staff casino ban receive
    15073, // Staff casino ban remove receive
    15081, // Staff referral set referrer
    15082, // Staff referral set referee
    15086, // Staff referral unset referrer
    15087 // Staff referral unset referee
];
