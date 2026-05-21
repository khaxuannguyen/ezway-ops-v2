export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; formError?: string; fieldErrors?: FieldErrors };

export const initialActionState: ActionResult<unknown> = {
  ok: false,
};

export function fieldError(result: ActionResult<unknown>, name: string): string | undefined {
  if (result.ok) return undefined;
  return result.fieldErrors?.[name]?.[0];
}
