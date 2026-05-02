import { ItemList } from "../objects/Item";
import { ItemLogWrapperMuseumSubType } from "../objects/ItemLogWrapper";
import { BaseService } from "./BaseService";

export class MuseumService extends BaseService {
    public readonly EXCHANGE_RATES: Record<ItemLogWrapperMuseumSubType, number> = {
        "plushie-set": 10,
        "exotic-flower-set": 10,
        "meteorite-fragment": 15,
        "patagonian-fossil": 20,
        "arrowhead-set": 25,
        "medieval-coin-set": 100,
        "vairocana-buddha": 100,
        "ganesha-sculpture": 250,
        "shabti-sculpture": 500,
        "companion-scripts": 1000,
        "senet-game-set": 2000,
        "egyptian-amulet": 10000,
    };

    public readonly SETS: Record<ItemLogWrapperMuseumSubType, number[]> = {
        "plushie-set": [
            ItemList.TEDDY_BEAR_PLUSHIE,
            ItemList.KITTEN_PLUSHIE,
            ItemList.MONKEY_PLUSHIE,
        ],
        "exotic-flower-set": [ItemList.DAHLIA],
        "meteorite-fragment": [],
        "patagonian-fossil": [],
        "arrowhead-set": [],
        "medieval-coin-set": [],
        "vairocana-buddha": [],
        "ganesha-sculpture": [],
        "shabti-sculpture": [],
        "companion-scripts": [],
        "senet-game-set": [],
        "egyptian-amulet": [],
    };
}
