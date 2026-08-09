import { Prisma } from "../../../generated/prisma";

/**
 * Prisma returns `Decimal` objects for `@db.Decimal` columns, which superjson does not know how
 * to serialise. The Sequelize app ran with `dialectOptions.decimalNumbers: true`, so the UI has
 * always received plain JS numbers for these fields (`i_price`, `r_late_fee`, `r_damage_fee`).
 *
 * `serialize` walks a result and converts every Decimal it finds — including ones nested in
 * included relations — and `DecimalToNumber` mirrors that transform at the type level so the
 * inferred procedure output matches what actually goes over the wire.
 */

export type DecimalToNumber<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? Date
    : T extends (infer U)[]
      ? DecimalToNumber<U>[]
      : T extends object
        ? { [K in keyof T]: DecimalToNumber<T[K]> }
        : T;

export function serialize<T>(value: T): DecimalToNumber<T> {
  if (value === null || value === undefined) {
    return value as DecimalToNumber<T>;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    return (value as Prisma.Decimal).toNumber() as DecimalToNumber<T>;
  }

  if (value instanceof Date) {
    return value as DecimalToNumber<T>;
  }

  if (Array.isArray(value)) {
    return value.map(serialize) as DecimalToNumber<T>;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serialize(item);
    }
    return out as DecimalToNumber<T>;
  }

  return value as DecimalToNumber<T>;
}
