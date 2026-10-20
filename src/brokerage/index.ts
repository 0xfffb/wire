type BrokerToken = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: number;
  scope?: string;
};

type BrokerAccount = {
  accId: string;
  cardMask: string;
  markets: string[];
};

type BrokerPosition = {
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

type BrokerFill = {
  dealId: string;
  side: string;
  code: string;
  stockName: string;
  qty: string;
  price: string;
  tradedAt: number;
};

type FillPage = {
  fills: BrokerFill[];
  /** 下一页游标；没有更多则为 null */
  nextPageFlag: string | null;
};

type AuthorizeUrlInput = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  /** 例如 trade:read */
  scope: string;
};

type ExchangeCodeInput = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

type ListFillsInput = {
  accessToken: string;
  accountId: string;
  market: string;
  /** 起始时间 unix ms */
  startAt: number;
  /** 结束时间 unix ms */
  endAt: number;
  pageFlag?: string;
};

/** 券商适配抽象。业务只依赖本类，不碰富途/SnapTrade SDK。 */
abstract class Brokerage {
  abstract readonly id: string;

  /** 拼授权页 URL（OAuth + PKCE）。 */
  abstract buildAuthorizeUrl(input: AuthorizeUrlInput): string;

  /** 用授权码换 token。 */
  abstract exchangeCode(input: ExchangeCodeInput): Promise<BrokerToken>;

  /** 刷新 access token。 */
  abstract refreshToken(refreshToken: string): Promise<BrokerToken>;

  /** 已授权可同步的业务账户。 */
  abstract listAccounts(accessToken: string): Promise<BrokerAccount[]>;

  /** 某账户当前持仓（全量）。 */
  abstract listPositions(accessToken: string, accountId: string): Promise<BrokerPosition[]>;

  /** 历史成交分页。 */
  abstract listFills(input: ListFillsInput): Promise<FillPage>;
}

export type {
  AuthorizeUrlInput,
  BrokerAccount,
  BrokerFill,
  BrokerPosition,
  BrokerToken,
  ExchangeCodeInput,
  FillPage,
  ListFillsInput,
};
export { Brokerage };
