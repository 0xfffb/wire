export type BrokerPosition = {
  code: string;
  stockName: string;
  side: string;
  qty: string;
  costPrice: string;
  marketVal: string;
  plRatio: string;
  plRatioValid: boolean;
  currency: string;
};

export type BrokerFill = {
  dealId: string;
  side: string;
  code: string;
  stockName: string;
  qty: string;
  price: string;
  tradedAt: number;
};

export type BrokerAccount = {
  accId: string;
  cardMask: string;
  markets: string[];
};

export type BrokerCash = {
  currency: string;
  cash: string;
};

export type BrokerFunds = {
  currency: string;
  cash: string;
  totalAssets: string;
  marketVal: string;
  balances: BrokerCash[];
};

export type FillPage = {
  fills: BrokerFill[];
  pageFlag: string;
  completed: boolean;
};

export type BrokerToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
};

export type BrokerAuthorization = {
  verifier: string;
  state: string;
  url: string;
};

export type BrokerApp = {
  clientId: string;
  registrationAccessToken: string;
};

export abstract class Broker {
  abstract readonly id: string;

  abstract register(redirectUri: string): Promise<BrokerApp>;

  abstract createAuthorization(clientId: string, redirectUri: string): BrokerAuthorization;

  abstract exchangeCode(code: string, verifier: string, clientId: string, redirectUri: string): Promise<BrokerToken>;

  abstract refresh(refreshToken: string, clientId: string): Promise<BrokerToken>;

  abstract listAccounts(accessToken: string): Promise<BrokerAccount[]>;

  abstract listFunds(accessToken: string, accId: string): Promise<BrokerFunds>;

  abstract listPositions(accessToken: string, accId: string): Promise<BrokerPosition[]>;

  abstract listFills(accessToken: string, accId: string, market: string, pageFlag: string): Promise<FillPage>;
}

export class BrokerRegistry {
  private readonly brokers = new Map<string, Broker>();

  register(broker: Broker) {
    this.brokers.set(broker.id, broker);
    return this;
  }

  get(id: string) {
    const broker = this.brokers.get(id);
    if (!broker) throw new Error(`未注册券商 ${id}`);
    return broker;
  }
}
