import { Context, ContractAbstraction, ContractProvider, Wallet } from "@taquito/taquito";
import { MetadataContext, Tzip16ContractAbstraction } from './tzip16-contract-abstraction'

export function tzip16<T extends ContractAbstraction<ContractProvider | Wallet>>(abs: T, context: Context) {
    return Object.assign(abs, {
        // namespace tzip16
        tzip16 (this: ContractAbstraction<ContractProvider | Wallet>) {
            return new Tzip16ContractAbstraction(this, context as MetadataContext);
        }
    })
}