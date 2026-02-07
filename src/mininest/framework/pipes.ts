import { z, ZodSchema } from 'zod';
import { BadRequestError } from './exceptions.ts';
import { PipeContext, PipeTransform } from './types.ts';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: any): any {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestError('Validation failed', result.error.flatten());
    }
    return result.data;
  }
}

export class ParseIntPipe implements PipeTransform {
  transform(value: any, metadata: PipeContext) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestError(
        `Parameter ${metadata.data ?? metadata.type} must be a number`,
      );
    }
    return parsed;
  }
}

export class TrimPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
}

export class ToBooleanPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    return Boolean(value);
  }
}
