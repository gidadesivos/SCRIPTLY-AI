import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FormField } from '@/components/FormField'
import { TagInput } from '@/components/TagInput'
import { AiFillButton } from '@/components/AiFillButton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  hint?: string
  placeholder?: string
  className?: string
  /**
   * Liga o botão de IA neste campo. Desligado por padrão: nome, site e
   * @instagram são dados factuais — a IA inventaria (N9).
   */
  ai?: boolean
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  className,
  ai,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField
          label={label}
          hint={hint}
          error={fieldState.error?.message}
          className={className}
          action={
            ai ? (
              <AiFillButton
                label={label}
                value={String(field.value ?? '')}
                onAccept={field.onChange}
              />
            ) : undefined
          }
        >
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
  ai,
}: BaseFieldProps<T> & { rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField
          label={label}
          hint={hint}
          error={fieldState.error?.message}
          className={className}
          action={
            ai ? (
              <AiFillButton
                label={label}
                value={String(field.value ?? '')}
                onAccept={field.onChange}
              />
            ) : undefined
          }
        >
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
  ai,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // O schema garante string[] neste campo; o Control genérico não prova.
        const values = (field.value ?? []) as string[]

        return (
          <FormField
            label={label}
            hint={hint}
            error={fieldState.error?.message}
            className={className}
            action={
              ai ? (
                <AiFillButton
                  label={label}
                  // A IA recebe a lista como texto e devolve texto; a conversão
                  // de volta para itens acontece no onAccept.
                  value={values.join('; ')}
                  onAccept={(next) =>
                    field.onChange(
                      next
                        .split(/[;\n]/)
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    )
                  }
                  surrounding="Este campo é uma LISTA. Devolva os itens separados por ponto e vírgula, sem numerar."
                />
              ) : undefined
            }
          >
            {({ id, 'aria-describedby': describedBy }) => (
              <TagInput
                id={id}
                aria-describedby={describedBy}
                value={values}
                onChange={field.onChange}
                label={label}
                placeholder={placeholder}
              />
            )}
          </FormField>
        )
      }}
    />
  )
}
