import { toRpcAmount } from "@gerailo/shared";

export function rpcAmount(value: bigint): number {
  return toRpcAmount(value) as unknown as number;
}
