import { Injectable } from '../framework/decorators.ts';
import { PipeContext, PipeTransform } from '../framework/types.ts';
import { BadRequestError } from '../framework/exceptions.ts';

@Injectable()
export class RequestLogPipe implements PipeTransform {
  transform(value: any, metadata: PipeContext) {
    const label = metadata.data ?? metadata.type;
    console.log(`[pipe:${metadata.type}] ${label} ->`, value);
    return value;
  }
}

@Injectable()
export class PositiveNumberPipe implements PipeTransform {
  transform(value: any, metadata: PipeContext) {
    if (metadata.data && metadata.data !== 'id') {
      return value;
    }
    const numeric =
      typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestError(
        `${metadata.data ?? 'value'} must be a positive number`,
      );
    }
    return numeric;
  }
}
