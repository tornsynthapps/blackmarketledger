import { mydebug } from "../debug";
import { LocalStorageInterface } from "../interfaces/localstorage";
import { MetadataInterface } from "../interfaces/metadata";
import { buildUrl, TornTradeDetailItem, TornTradeListItem } from "../torn-api";
import { TornTrade, Weav3rReceipt } from "./trade";
import { createRateLimiter } from "../rate-limiter";
import {
  getTornApiRateLimit,
  getWeav3rApiRateLimit,
  refreshApiKeysFromStorage,
} from "../api-keys";

let tornRateLimiter = createRateLimiter(getTornApiRateLimit());
let weav3rRateLimiter = createRateLimiter(getWeav3rApiRateLimit());

export function refreshApiRateLimiters() {
  refreshApiKeysFromStorage();
  tornRateLimiter = createRateLimiter(getTornApiRateLimit());
  weav3rRateLimiter = createRateLimiter(getWeav3rApiRateLimit());
}

export class TornAPI {
  private static BASE_URL = "https://api.torn.com/v2/";

  /**
   * Sends a request to the Torn API.
   * @param endpoint string: The endpoint to send the request to.
   * @param method string: The HTTP method to use.
   * @param body any: The body of the request.
   * @returns Promise<any>: The response from the Torn API.
   */
  static async sendRequest(
    endpoint: string,
    method: string = "GET",
    queries: Record<string, string> = {},
  ): Promise<any> {
    await tornRateLimiter.acquire();

    // Add comment to the query string
    queries.comment = queries.comment ?? "Blackmarket Ledger";

    const url = new URL(this.BASE_URL + endpoint);
    url.search = new URLSearchParams(queries).toString();

    mydebug(url.toString());

    return fetch(url.toString(), {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${LocalStorageInterface.getAnyAPIKey()}`,
      },
    });
  }

  /**
   * Gets the basic user details from the Torn API.
   * @returns Promise<any>: The basic user details.
   */
  static async getBasicUserDetails(): Promise<any> {
    const response = await this.sendRequest("user", "GET");
    const responseJSON = await response.json();
    mydebug(responseJSON, "TornAPI.getBasicUserDetails: User details fetched");
    return responseJSON.profile;
  }

  /**
   * Gets a Torn trade from the Torn API.
   * @param id string: The trade ID.
   * @returns Promise<TornTrade>: The trade details.
   */
  static async getTornTrade(id: string): Promise<TornTrade> {
    const response = await this.sendRequest(`user/${id}/trade`, "GET");
    const responseJson = await response.json();
    const tradeDetails = responseJson.trade;

    mydebug(responseJson, "TornAPI.getTornTrade: Trade details fetched");
    mydebug(tradeDetails, "TornAPI.getTornTrade: Trade details fetched");
    return new TornTrade(
      tradeDetails.id,
      tradeDetails.id,
      tradeDetails.timestamp,
      tradeDetails.description,
      tradeDetails.user.id,
      tradeDetails.trader.id,
      tradeDetails.items,
    );
  }

  static async getTornTrades(from: number, to: number): Promise<TornTrade[]> {
    // TODO: Reimplement this using new this.sendRequest().
    const queryParams: Record<string, string> = {
      cat: "finished",
      from: String(from),
      limit: "100",
      sort: "DESC",
      key: LocalStorageInterface.getAnyAPIKey(),
    };
    if (to !== undefined) {
      queryParams.to = String(to);
    }
    let currentUrl = buildUrl(this.BASE_URL, "/user/trades", queryParams);

    let allTrades: any[] = [];
    while (true) {
      await tornRateLimiter.acquire();
      const response = await fetch(currentUrl, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (data?.error?.code === 17) {
        return [];
      }

      if (data?.error) {
        throw new Error(
          data.error.error || "Torn API error during trades fetch",
        );
      }

      const page: TornTradeListItem[] = Array.isArray(data?.trades)
        ? (data.trades as TornTradeListItem[])
        : [];

      if (page.length > 0) {
        allTrades = allTrades.concat(page);
      }

      const prevLink = data?._metadata?.links?.prev;
      // If we got exactly 100 results, try to fetch next page.
      if (!prevLink || page.length < 100) {
        break;
      }

      // Update currentUrl to become the next (prev) metadata link.
      currentUrl = prevLink;
      // Force limit to 100 for subsequent pages even if metadata gives lower.
      const urlWithKey = new URL(currentUrl);
      urlWithKey.searchParams.set("key", LocalStorageInterface.getAnyAPIKey());
      urlWithKey.searchParams.set("limit", "100");
      currentUrl = urlWithKey.toString();
    }

    mydebug(allTrades, "TornAPI.getTornTrades: All trades fetched");

    return await Promise.all(
      allTrades.map(async (trade: Record<string, any>) => {
        return this.getTornTrade(trade.id);
      }),
    );
  }
}

export class T3BAPI {
  static BASE_URL = "https://weav3r.dev/api/";

  static async getReceipt(receiptId: string): Promise<Weav3rReceipt> {
    await weav3rRateLimiter.acquire();
    const apiKey = LocalStorageInterface.getWeav3rAPIKey();
    const userID = await MetadataInterface.getUserID();
    const response: Response = await fetch(
      `${T3BAPI.BASE_URL}trades/${userID}/${receiptId}?apiKey=${apiKey}`,
      { cache: "no-store" },
    );
    const responseJSON = await response.json();
    mydebug(responseJSON, "T3BAPI.getReceipt: Response JSON");

    if (!responseJSON || !responseJSON.id) {
      throw new Error(`Failed to fetch receipt ${receiptId}`);
    }

    return new Weav3rReceipt(
      responseJSON.id,
      responseJSON.id,
      responseJSON.total_value,
      responseJSON.created_at,
      responseJSON.updated_at,
      responseJSON.items,
    );
  }

  static async getReceipts(
    from: number,
    to?: number,
  ): Promise<Weav3rReceipt[]> {
    const apiKey = LocalStorageInterface.getWeav3rAPIKey();
    const userID = await MetadataInterface.getUserID();
    let currentURL: string | null =
      `${T3BAPI.BASE_URL}trades/${userID}?from=${from}${to ? `&to=${to}` : ""}&apiKey=${apiKey}`;

    const collected: string[] = [];
    while (currentURL) {
      await weav3rRateLimiter.acquire();
      mydebug(currentURL, "T3BAPI.getReceipts: Fetching next page");
      const response: Response = await fetch(currentURL, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!data || !data.trades || !Array.isArray(data.trades)) {
        break;
      }

      const trades = data.trades;
      collected.push(
        ...trades
          .map((t: Record<string, any>) => t.id)
          .filter((id: string) => id),
      );

      currentURL = data.metadata?.next || null;
    }

    return await Promise.all(
      collected.map(async (receiptId: string) => {
        return await T3BAPI.getReceipt(receiptId);
      }),
    );
  }
}
