'use client'
import {useEffect} from "react";
import {useForm} from "react-hook-form";
import classNames from "classnames";
import {Building2} from "lucide-react";
import {updateCandidate, createCandidate} from "@/shared/api/candidates.api";
import {useYear} from '@/shared/store/edition.store';
import {FieldError, Input, Label, NativeSelect, Switch, Textarea} from "@/shared/ui/Field";
import PhotoField from "@/shared/ui/ImageUpload";
import {toast} from "@/shared/ui/toast";

const required = 'Обязательное поле';

const LangBlock = ({lang, title, register, errors}) => (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 ring-1 ring-zinc-200">{lang.toUpperCase()}</span>
            {title}
        </div>
        <div className="grid gap-3">
            <div>
                <Label htmlFor={`${lang}-name`}>Имя / название</Label>
                <Input id={`${lang}-name`} invalid={!!errors?.[lang]?.name} placeholder={lang === 'ru' ? 'Иванов Иван Иванович' : 'Ivanov Ivan Ivanovich'}
                       {...register(`${lang}.name`, {required})}/>
                <FieldError error={errors?.[lang]?.name}/>
            </div>
            <div>
                <Label htmlFor={`${lang}-desc`}>Должность / описание</Label>
                <Textarea id={`${lang}-desc`} rows={2} invalid={!!errors?.[lang]?.description}
                          placeholder={lang === 'ru' ? 'Хоким Бектемирского района' : 'Bektemir tumani hokimi'}
                          {...register(`${lang}.description`, {required})}/>
                <FieldError error={errors?.[lang]?.description}/>
            </div>
        </div>
    </div>
);

/**
 * Candidate profile form.
 * - formId: lets an external footer button submit it (<button form={formId}>)
 * - onSaved(result) after successful create/update; onBusy(bool) to reflect submit state outside
 */
const CandidateForm = ({type = 'create', candidate, nominations = [], defaultNomination, nextOrder, formId = 'candidate-form', onSaved, onBusy, onDirty, children}) => {
    const year = useYear()
    const {register, handleSubmit, control, watch, setValue, formState: {errors, isDirty}} = useForm({
        defaultValues: candidate
            ? {
                ru: candidate.ru, uz: candidate.uz, nomination: candidate.nomination, photo: candidate.photo,
                isCompany: !!candidate.isCompany, newsQueriesText: (candidate.newsQueries ?? []).join('\n'),
            }
            : {ru: {name: '', description: ''}, uz: {name: '', description: ''}, nomination: defaultNomination ?? nominations[0]?._id ?? '', photo: null, isCompany: false, newsQueriesText: ''}
    })
    useEffect(() => { onDirty?.(isDirty) }, [isDirty]);
    const isCompany = watch('isCompany');

    const onSubmit = async ({newsQueriesText, photo, ...rest}) => {
        const data = {
            ru: rest.ru, uz: rest.uz, nomination: rest.nomination, isCompany: !!rest.isCompany,
            newsQueries: (newsQueriesText ?? '').split('\n').map(q => q.trim()).filter(Boolean),
        }
        if (type === 'create') { data.year = year; if (nextOrder != null) data.order = nextOrder }
        const formData = new FormData()
        if (photo instanceof File) formData.append('photo', photo)
        else if (photo) data.photo = photo
        formData.append('body', JSON.stringify(data))
        onBusy?.(true)
        try {
            const result = type === 'create' ? await createCandidate(formData) : await updateCandidate(candidate._id, formData)
            toast.success(type === 'create' ? 'Кандидат создан' : 'Изменения сохранены', data.ru.name)
            await onSaved?.(result, data)
        } catch (e) {
            toast.fromError(e, type === 'create' ? 'Не удалось создать кандидата' : 'Не удалось сохранить')
        } finally {
            onBusy?.(false)
        }
    }
    const onInvalid = () => toast.error('Проверьте форму', 'Заполните обязательные поля')

    return (
        <form id={formId} onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid gap-5" noValidate>
            <PhotoField control={control} required={type === 'create'}/>

            <div className="grid gap-4 md:grid-cols-2">
                <LangBlock lang="ru" title="Русский" register={register} errors={errors}/>
                <LangBlock lang="uz" title="Oʻzbekcha" register={register} errors={errors}/>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <Label htmlFor="cand-nomination">Номинация</Label>
                    <NativeSelect id="cand-nomination" {...register('nomination', {required})}>
                        {nominations.map(n => <option key={n._id} value={n._id}>{n.ru?.name}</option>)}
                    </NativeSelect>
                </div>
                <div className={classNames('flex items-center rounded-xl border px-3 py-2.5 transition', isCompany ? 'border-sky-200 bg-sky-50/60' : 'border-zinc-200')}>
                    <Switch id="cand-company" checked={isCompany} onChange={v => setValue('isCompany', v, {shouldDirty: true})}
                            label={<span className="inline-flex items-center gap-1.5"><Building2 size={14}/>Компания / организация</span>}
                            description="Не человек, а бренд или организация"/>
                </div>
            </div>

            <div>
                <Label htmlFor="cand-queries" hint="по одному в строке">Поисковые запросы для новостей</Label>
                <Textarea id="cand-queries" rows={3}
                          placeholder={'Например:\nИванов Иван\nIvanov Ivan'} {...register('newsQueriesText')}/>
                <p className="mt-1.5 text-xs text-zinc-500">Если пусто — ищем по имени на русском и узбекском.</p>
            </div>
            {children}
        </form>
    )
}

export default CandidateForm;
