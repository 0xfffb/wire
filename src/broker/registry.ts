import { BrokerRegistry } from "./broker";
import { FutuBroker } from "./futu";

export const brokerRegistry = new BrokerRegistry().register(new FutuBroker());
