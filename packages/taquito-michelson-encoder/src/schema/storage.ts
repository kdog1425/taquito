import { Token } from '../tokens/token';

import { BigMapToken } from '../tokens/bigmap';

import { createToken } from '../tokens/createToken';

import { RpcTransaction } from './model';
import { ScriptResponse } from '@taquito/rpc';
import { Michelson } from './types';

/**
 * @warn Our current smart contract abstraction feature is currently in preview. It's API is not final, and it may not cover every use case (yet). We will greatly appreciate any feedback on this feature.
 */
export class Schema {
  private root: Token;
  private bigMap?: BigMapToken;

  static fromRPCResponse(val: { script: ScriptResponse }) {
    const storage =
      val &&
      val.script &&
      Array.isArray(val.script.code) &&
      val.script.code.find((x: any) => x.prim === 'storage');

    if (!storage || !Array.isArray(storage.args)) {
      throw new Error('Invalid rpc response passed as arguments');
    }

    return new Schema(storage.args[0]);
  }

  constructor(val: Michelson) {
    this.root = createToken(val, 0);

    if (val.prim === 'pair' && Array.isArray(val.args) && val.args[0].prim === 'big_map') {
      this.bigMap = new BigMapToken(val.args[0], 0, createToken);
    }
  }

  private removeTopLevelAnnotation(obj: any) {
    if (typeof obj === 'object' && Object.keys(obj).length === 1) {
      return obj[Object.keys(obj)[0]];
    }

    return obj;
  }

  Execute(val: any) {
    const storage = this.root.Execute(val);

    return this.removeTopLevelAnnotation(storage);
  }

  ExecuteOnBigMapDiff(diff: any[]) {
    if (!this.bigMap) {
      throw new Error('No big map schema');
    }

    if (!Array.isArray(diff)) {
      throw new Error('Invalid big map diff. It must be an array');
    }

    const eltFormat = diff.map(({ key, value }) => ({ args: [key, value] }));

    return this.bigMap.Execute(eltFormat);
  }

  ExecuteOnBigMapValue(key: any) {
    if (!this.bigMap) {
      throw new Error('No big map schema');
    }

    return this.bigMap.ValueSchema.Execute(key);
  }

  EncodeBigMapKey(key: string) {
    if (!this.bigMap) {
      throw new Error('No big map schema');
    }

    return this.bigMap.KeySchema.ToBigMapKey(key);
  }

  Encode(_value?: any) {
    return this.root.EncodeObject(_value);
  }

  ExtractSchema() {
    return this.removeTopLevelAnnotation(this.root.ExtractSchema());
  }

  ComputeState(tx: RpcTransaction[], state: any) {
    if (!this.bigMap) {
      throw new Error('No big map schema');
    }

    const bigMap = tx.reduce((prev, current) => {
      return {
        ...prev,
        ...this.ExecuteOnBigMapDiff(current.contents[0].metadata.operation_result.big_map_diff),
      };
    }, {});

    return {
      ...this.Execute(state),
      [this.bigMap.annot()]: bigMap,
    };
  }
}
