import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FormField } from '@/components/FormField'
import { TagInput } from '@/components/TagInput'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  hint?: string
  placeholder?: string
  className?: string
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  className,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField label={label} hint={hint} error={fieldState.error?.message} className={className}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              {...field}
              value={field.value ?? ''}
              placeholder={placeholder}
            />
          )}
        </FormField>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  rows = 4,
  className,
}: BaseFieldProps<T> & { rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField label={label} hint={hint} error={fieldState.error?.message} className={className}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              {...field}
              value={field.value ?? ''}
              rows={rows}
              placeholder={placeholder}
            />
          )}
        </FormField>
      )}
    />
  )
}

export function TagField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  className,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField label={label} hint={hint} error={fieldState.error?.message} className={className}>
          {({ id, 'aria-describedby': describedBy }) => (
            <TagInput
              id={id}
              aria-describedby={describedBy}
              // O schema garante string[] neste campo; o Control genérico não consegue provar.
              value={(field.value ?? []) as string[]}
              onChange={field.onChange}
              label={label}
              placeholder={placeholder}
            />
          )}
        </FormField>
      )}
    />
  )
}
