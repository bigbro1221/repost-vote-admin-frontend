'use client'
import {Controller} from "react-hook-form";
import {useEffect, useRef, useState} from "react";
import classNames from "classnames";
import {ImagePlus, RefreshCw, Trash2} from "lucide-react";
import {photoUrl} from "@/shared/lib/format";

// Photo field: value is either the stored filename (string) or a File chosen by the user.
const PhotoField = ({control, required, name = 'photo'}) => {
    const inputRef = useRef(null);
    return (
        <Controller
            control={control}
            name={name}
            rules={required ? {validate: v => (v && (typeof v === 'string' || v instanceof File)) || 'Загрузите фото'} : undefined}
            render={({field: {value, onChange}, fieldState: {error}}) => (
                <PhotoInner value={value} onChange={onChange} error={error} inputRef={inputRef}/>
            )}
        />
    );
};

const PhotoInner = ({value, onChange, error, inputRef}) => {
    const [preview, setPreview] = useState(null);
    const [over, setOver] = useState(false);
    useEffect(() => {
        if (value instanceof File) {
            const url = URL.createObjectURL(value);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(photoUrl(value));
    }, [value]);

    const pick = file => { if (file && file.type.startsWith('image/')) onChange(file); };

    return (
        <div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
                   onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }}/>
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => inputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setOver(true); }}
                        onDragLeave={() => setOver(false)}
                        onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
                        className={classNames('group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition',
                            preview ? 'ring-1 ring-zinc-200' : 'border-2 border-dashed bg-zinc-50 hover:bg-zinc-100',
                            over ? 'border-brand-blue bg-sky-50' : error ? 'border-red-300' : 'border-zinc-300')}>
                    {preview ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="" className="h-full w-full object-cover"/>
                            <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                Заменить
                            </span>
                        </>
                    ) : (
                        <span className="flex flex-col items-center gap-1 text-zinc-400">
                            <ImagePlus size={22}/>
                            <span className="text-[11px] font-medium">Фото</span>
                        </span>
                    )}
                </button>
                <div className="min-w-0 text-[13px] text-zinc-500">
                    <div className="font-medium text-zinc-700">Фото кандидата</div>
                    <div className="mt-0.5">JPG или PNG, квадратное. Перетащите файл или нажмите.</div>
                    <div className="mt-2 flex gap-1">
                        <button type="button" onClick={() => inputRef.current?.click()}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                            <RefreshCw size={13}/>{preview ? 'Заменить' : 'Выбрать'}
                        </button>
                        {value instanceof File && (
                            <button type="button" onClick={() => onChange(null)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                                <Trash2 size={13}/>Отменить
                            </button>
                        )}
                    </div>
                    {error && <div className="mt-1 text-xs font-medium text-red-600">{error.message}</div>}
                </div>
            </div>
        </div>
    );
};

export default PhotoField;
