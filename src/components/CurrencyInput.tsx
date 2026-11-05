export default function CurrencyInput(props: {
  value: string | number;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Classes on the wrapper (e.g. a fixed width for compact/inline use). */
  class?: string;
  /** Classes on the input itself. Defaults to the shared `.field` style. */
  inputClass?: string;
}) {
  return (
    <div class={`relative ${props.class ?? ""}`}>
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onInput={e => props.onInput?.(e.currentTarget.value)}
        onChange={e => props.onChange?.(e.currentTarget.value)}
        class={`${props.inputClass ?? "field"} pl-7`}
      />
    </div>
  );
}
