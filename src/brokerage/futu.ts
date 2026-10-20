import {
  Brokerage,
  type AuthorizeUrlInput,
  type BrokerAccount,
  type BrokerPosition,
  type BrokerToken,
  type ExchangeCodeInput,
  type FillPage,
  type ListFillsInput,
} from "./index";

class FutuBrokerage extends Brokerage {
  readonly id = "futu";

  buildAuthorizeUrl(_input: AuthorizeUrlInput): string {
    throw new Error("not_implemented: futu.buildAuthorizeUrl");
  }

  exchangeCode(_input: ExchangeCodeInput): Promise<BrokerToken> {
    throw new Error("not_implemented: futu.exchangeCode");
  }

  refreshToken(_refreshToken: string): Promise<BrokerToken> {
    throw new Error("not_implemented: futu.refreshToken");
  }

  listAccounts(_accessToken: string): Promise<BrokerAccount[]> {
    throw new Error("not_implemented: futu.listAccounts");
  }

  listPositions(_accessToken: string, _accountId: string): Promise<BrokerPosition[]> {
    throw new Error("not_implemented: futu.listPositions");
  }

  listFills(_input: ListFillsInput): Promise<FillPage> {
    throw new Error("not_implemented: futu.listFills");
  }
}

export { FutuBrokerage };
