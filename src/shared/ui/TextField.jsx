'use client'
import classNames from "classnames"
import {FieldError, Input, Label} from './Field'

// Back-compat wrapper (label + input + error) used by older forms.
const TextField = ({label, className, error, inputProps, wrapperClassName, type, placeholder, hint}) => (
    <div className={classNames(wrapperClassName, 'w-full')}>
        {label && <Label hint={hint}>{label}</Label>}
        <Input {...inputProps} type={type ?? inputProps?.type} className={className} invalid={!!error}
               placeholder={placeholder && placeholder !== '...' ? placeholder : 'Введите значение…'}/>
        <FieldError error={error}/>
    </div>
)

export default TextField
