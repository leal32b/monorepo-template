import { type ComponentProps, splitProps } from 'solid-js'
import { cn } from '#libs'
import { inputClass } from './input-class'

export type InputProps = ComponentProps<'input'>

/** A text input without a visible label (a search box named by `aria-label`); a labelled one is a `Field`. */
export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['class'])

  return <input class={cn(inputClass, local.class)} {...rest} />
}
