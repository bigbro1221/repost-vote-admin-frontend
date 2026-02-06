'use client';

import { useState } from 'react';
import { useAuthStore } from "@/shared/store/auth.store";
import TextField from "@/shared/ui/TextField";
import classNames from "classnames";
import { useForm } from 'react-hook-form';

const required = 'Заполните поле';

export default function SignIn() {
  const [ submitting, setSubmitting ] = useState(false);
  const { signIn } = useAuthStore();

  const defaultValues = {
    login: '',
    password: ''
  };

  const {
    register,
    formState: { errors },
    handleSubmit
  } = useForm({
    defaultValues
  });

  const onSubmit = async (data) => {
    setSubmitting(true);

    const success = await signIn(data);

    if (!success) alert('Неверный логин или пароль');

    setSubmitting(false);
  };

  return (
    <form
      className="w-96 max-w-full mx-auto mt-10"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-3xl mb-7 text-center font-semibold">
        Авторизация
      </h2>

      <TextField
        inputProps={register('login', { required })}
        error={errors?.login}
        label="Логин"
      />

      <TextField
        inputProps={register('password', { required })}
        error={errors?.password}
        label="Пароль"
        wrapperClassName="mt-6"
      />

      <button
        className={classNames([
          'w-full mt-6 text-white rounded px-8 py-2 text-lg',
          {
            'bg-gray-500': submitting,
            'bg-blue-600': !submitting
          }
        ])}
        disabled={submitting}
        type="submit"
      >
        { submitting ? 'Вход...' : 'Войти' }
      </button>
    </form>
  );
}