import { BaseService } from "./BaseService";
import { SyncCursor, TornLogEntry, normalizeTornLog, NormalizedLog } from "../objects/TornLog";
import { 
    defaultLogRegistry, 
    LogHandlerRegistry,
    HandlerDependencies 
} from "./LogParserRegistry";
import { initializeDefaultHandlers } from "./LogHandlers";
import { TornAPIClient } from "../tornAPI";
import { getTornApiKeyFull } from "../old/api-keys";
import { ItemLogService } from "./ItemLogService";
import { MuseumService } from "./MuseumService";
import { categories } from "@/constants/tempLogCategories";

// Ensure handlers are registered
initializeDefaultHandlers();

export const FUTURE_WORK : number[] = [
    1101, // Item market remove (old)
    1102, // Item market edit (old)
    1110, // Item market add
    1111, // Item market remove
    1115, // Item market price edit
    1116, // Item market anonymity edit
    1211, // Bazaar remove (legacy)
    1222, // Bazaar add
    1223, // Bazaar remove
    1224, // Bazaar edit
    1300, // Display add (legacy)
    1301, // Display remove (legacy)
    1302, // Display add
    1303, // Display remove
    1402, // Dump find none
    1403, // Dump add
    1404, // Dump find
    1500, // Big Al's bunker sell
    1501, // Big Al's bunker buy
    2010, // Item use entertainment
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
    4220, // Item shop sell points
    4750, // Loadout switch
    4751, // Loadout rename
    4752, // Loadout reset
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
    5700, // Crime fail
    5705, // Crime fail jail
    5710, // Crime fail hospital
    5715, // Crime fail money loss
    5720, // Crime success money gain
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
    6221, // Company employee pay
    6222, // Company director pay
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
    6294, // Company director change send
    6295, // Company director change receive
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
    7800, // Missions accept
    7805, // Missions decline
    7810, // Missions fail
    7815, // Missions complete
    7850, // Missions receive energy
    7851, // Missions receive nerve
    7900, // Missions buy reward item
    7905, // Missions buy reward ammo
    7910, // Missions buy reward mod
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
    9309, // Crime item add for forgery
    9310, // Crime use items for forgery
    9350, // Crime graffiti reputation up
    9351, // Crime graffiti reputation down
    9356, // Crime scamming read email
    9360, // Crime arson inquire
    9361, // Crime use items for arson
    9362, // Crime unlock item for arson
];
export const SKIPPED_LOGS: number[] = FUTURE_WORK.concat([
    1100, // Item market add (old)
    1200, // Bazaar name change
    1201, // Bazaar description change
    1210, // Bazaar add (legacy)
    1212, // Bazaar edit (legacy)
    4700, // Items equip
    4710, // Items unequip
    5000, // Points Market Add
    5001, // Points Market Remove
    6220, // Job pay
    6404, // Job special gain money
    8411, // Casino poker table leave
]);

export class TornLogService extends BaseService {
    protected get SERVICE_NAME() { return "TornLogService"; }

    private readonly registry: LogHandlerRegistry;
    private readonly itemLogService: ItemLogService;
    private readonly museumService: MuseumService;

    constructor(registry: LogHandlerRegistry = defaultLogRegistry) {
        super();
        this.registry = registry;
        this.itemLogService = new ItemLogService();
        this.museumService = new MuseumService();
    }

    /**
     * Fetches new logs from Torn API across registered categories and ingests them directly into the database.
     * @param cursor (SyncCursor): Starting point for the sync
     * @param toTimestamp (number): Ending point for the sync
     * @returns (Promise<{ nextCursor: SyncCursor, earliestTimestamp: number | null }>): The updated cursor and the oldest log timestamp processed
     */
    public async fetchAndIngestNewLogs(
        cursor: SyncCursor,
        toTimestamp: number
    ): Promise<{ nextCursor: SyncCursor; earliestTimestamp: number | null; unsupportedLogs: NormalizedLog[] }> {
        const apiKey = getTornApiKeyFull();
        if (!apiKey) throw new Error("Missing Torn API Key");

        const registeredTypeIds = this.registry.getRegisteredTypes();
        const categories = [6, 11, 12, 18]; // Standard categories to check

        this.logger.info(`Fetching logs from ${cursor.lastTimestamp} to ${toTimestamp}`);

        const itemNames = await TornAPIClient.getItemNames();
        const nameToIdMap: Record<string, number> = {};
        Object.entries(itemNames).forEach(([id, name]) => {
            nameToIdMap[name.toLowerCase()] = parseInt(id, 10);
        });

        const deps: HandlerDependencies = {
            itemLogService: this.itemLogService,
            museumService: this.museumService,
            nameToIdMap
        };

        const allLogs: TornLogEntry[] = [];

        // Fetch logs for each category
        for (const cat of categories) {
            try {
                const logs = await this.fetchCategoryLogs(apiKey, cat, cursor.lastTimestamp, toTimestamp);
                allLogs.push(...logs);
            } catch (error) {
                this.logger.error(`Failed to fetch logs for category ${cat}`, error);
            }
        }

        // De-duplicate and filter
        const seenLogIds = new Set<string>();
        const normalizedLogs = allLogs
            .map(normalizeTornLog)
            .filter((log) => {
                if (seenLogIds.has(log.id)) return false;
                seenLogIds.add(log.id);
                return true;
            })
            .filter((log) => {
                // Ensure we only process logs strictly after the cursor
                if (log.timestamp < cursor.lastTimestamp) return false;
                if (log.timestamp === cursor.lastTimestamp && this.compareLogIds(log.id, cursor.lastLogId) <= 0) return false;
                return true;
            })
            .sort((a, b) => a.timestamp - b.timestamp || this.compareLogIds(a.id, b.id));

        this.logger.info(`Ingesting ${normalizedLogs.length} logs...`);

        let earliestTimestamp: number | null = null;
        const unsupportedLogs: NormalizedLog[] = [];

        for (const log of normalizedLogs) {
            const isSupported = registeredTypeIds.includes(log.typeId);
            const isFutureWork = FUTURE_WORK.includes(log.typeId);
            const isSkipped = SKIPPED_LOGS.includes(log.typeId) && !isFutureWork;
            const metadata = this.registry.getMetadata(log.typeId);

            // ALWAYS store raw log data for audit/debugging in SystemLog
            if (isSupported) {
                this.logger.info(`Processing Log [${log.typeId}]: ${log.title}`, log);
                
                // If the log is supported but doesn't have UID support yet, export it specifically for developers
                if (metadata && !metadata.uidSupported) {
                    this.logger.warn(`UID_NOT_SUPPORTED [${log.typeId}]: ${log.title}`, {
                        id: log.id,
                        timestamp: log.timestamp,
                        data: log.data,
                        params: log.params
                    });
                }
            } else if (isFutureWork) {
                this.logger.info(`Future work log type ID ${log.typeId} encountered.`, log);
                unsupportedLogs.push({ ...log, logCategory: "future_work" } as any);
            } else if (!isSkipped) {
                this.logger.error(`Unsupported log type ID ${log.typeId} encountered.`, log);
                unsupportedLogs.push({ ...log, logCategory: "unsupported" } as any);
            }

            // Only process business logic if it's a type we care about
            if (isSupported) {
                try {
                    await this.registry.process(log, deps);
                    
                    // Track earliest timestamp successfully processed
                    if (earliestTimestamp === null || log.timestamp < earliestTimestamp) {
                        earliestTimestamp = log.timestamp;
                    }
                } catch (error) {
                    this.logger.error(`Error processing log ID ${log.id}`, error);
                }
            }
        }

        const last = normalizedLogs[normalizedLogs.length - 1];
        const nextCursor: SyncCursor = last 
            ? { lastTimestamp: last.timestamp, lastLogId: last.id }
            : { ...cursor, lastTimestamp: toTimestamp };

        this.logger.info(`Ingestion complete. Next cursor: ${nextCursor.lastTimestamp}`);

        return { nextCursor, earliestTimestamp, unsupportedLogs };
    }

    private async fetchCategoryLogs(
        apiKey: string,
        category: number,
        from: number,
        to: number
    ): Promise<TornLogEntry[]> {
        const allLogs: TornLogEntry[] = [];
        let currentTo = to;

        while (true) {
            const url = new URL("https://api.torn.com/v2/user/log");
            url.searchParams.set("cat", String(category));
            url.searchParams.set("from", String(from));
            url.searchParams.set("to", String(currentTo));
            url.searchParams.set("limit", "100");
            url.searchParams.set("sort", "desc");
            url.searchParams.set("key", apiKey);

            const response = await fetch(url.toString(), { cache: "no-store" });
            const data = await response.json();

            if (data.error) {
                if (data.error.code === 17) break; // No logs found
                throw new Error(data.error.error || "Torn API Error");
            }

            const page = Array.isArray(data.log) ? data.log : [];
            if (page.length === 0) break;

            allLogs.push(...page);

            if (page.length < 100) break;

            // Move currentTo back to the earliest log in this page
            const earliest = Math.min(...page.map((l: { timestamp: number | string }) => Number(l.timestamp)));
            if (earliest <= from) break;
            currentTo = earliest - 1;
        }

        return allLogs;
    }

    private compareLogIds(left: string, right: string): number {
        if (left.length !== right.length) {
            return left.length - right.length;
        }
        return left.localeCompare(right);
    }
}
