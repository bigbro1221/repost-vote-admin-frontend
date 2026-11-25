'use client'
import {useForm} from "react-hook-form";
import {Trophy} from "lucide-react";
import {createNomination, updateNomination} from "@/shared/api/nominations.api";
import {FieldError, Input, Label} from "@/shared/ui/Field";
import Modal from "@/shared/ui/Modal";
import Button from "@/shared/ui/Button";
import {toast} from "@/shared/ui/toast";

const required = 'Обязательное поле'

const Fields = ({register, errors}) => (
    <div className="grid gap-4">
        <div>
            <Label htmlFor="nom-ru">Название на русском</Label>
            <Input id="nom-ru" data-autofocus invalid={!!errors?.ru?.name} placeholder="Самый активный хоким района" {...register('ru.name', {required})}/>
            <FieldError error={errors?.ru?.name}/>
        </div>
        <div>
            <Label htmlFor="nom-uz">Название на узбекском</Label>
            <Input id="nom-uz" invalid={!!errors?.uz?.name} placeholder="Eng faol tuman hokimi" {...register('uz.name', {required})}/>
            <FieldError error={errors?.uz?.name}/>
        </div>
    </div>
)

// Create/edit nomination in a modal. onSaved(result) after success.
export const NominationDialog = ({open, nomination, onClose, onSaved}) => {
    const type = nomination?._id ? 'update' : 'create'
    const {register, formState: {errors, isSubmitting}, handleSubmit} = useForm({
        values: {ru: {name: nomination?.ru?.name ?? ''}, uz: {name: nomination?.uz?.name ?? ''}},
    })
    const onSubmit = async data => {
        try {
            const result = type === 'create'
                ? await createNomination(data)
                : await updateNomination({...data, _id: nomination._id})
            toast.success(type === 'create' ? 'Номинация создана' : 'Номинация обновлена', data.ru.name)
            await onSaved?.(result)
            onClose()
        } catch (e) {
            toast.fromError(e, 'Не удалось сохранить номинацию')
        }
    }
    return (
        <Modal open={open} onClose={onClose} icon={Trophy}
               title={type === 'create' ? 'Новая номинация' : 'Редактировать номинацию'}
               description={type === 'create' ? 'Номинация появится в конце списка.' : undefined}
               footer={<>
                   <Button variant="secondary" onClick={onClose}>Отмена</Button>
                   <Button type="submit" form="nomination-form" variant="primary" loading={isSubmitting}>
                       {type === 'create' ? 'Создать' : 'Сохранить'}
                   </Button>
               </>}>
            <form id="nomination-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Fields register={register} errors={errors}/>
            </form>
        </Modal>
    )
}

export default NominationDialog;
