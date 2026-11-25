// API error → human-readable Russian message
const CODES = {
    CONFIRMATION_MISMATCH: 'Число получателей изменилось — подтвердите отправку заново',
    USER_NOT_FOUND: 'Пользователь не найден среди наших пользователей (бот может писать только тем, кто нажимал /start)',
    USER_BLOCKED_BOT: 'Пользователь заблокировал бота',
    BROADCAST_NOT_DRAFT: 'Рассылка уже запущена или отменена',
    BROADCAST_NOT_CANCELLABLE: 'Эту рассылку уже нельзя отменить',
    TEXT_REQUIRED: 'Введите текст сообщения',
    TEXT_TOO_LONG: 'Сообщение длиннее 4096 символов',
    INVALID_ENTITIES: 'Некорректное форматирование сообщения',
    INVALID_TO: 'Укажите @username, ссылку t.me/… или числовой tg id',
    TO_REQUIRED: 'Укажите получателя',
    RATE_LIMITED: 'Telegram ограничил частоту отправки, попробуйте позже',
    TELEGRAM_ERROR: 'Telegram вернул ошибку',
    NEWS_ALREADY_EXISTS: 'Эта новость уже есть (возможно, в игнорируемых)',
    INVALID_INPUT: 'Вставьте ссылку https://repost.uz/… или slug',
    CANDIDATE_NOT_FOUND: 'Кандидат не найден',
    NOMINATION_NOT_FOUND: 'Номинация не найдена',
    EDITION_NOT_FOUND: 'Издание не найдено',
    EDITION_EXISTS: 'Такой год уже существует',
    ANOTHER_EDITION_ACTIVE: 'Активным может быть только одно издание — сначала закройте текущее',
    TARGET_HAS_NOMINATIONS: 'В этом году уже есть номинации — включите «перезаписать»',
    SOURCE_EMPTY: 'В исходном году нет номинаций',
    SAME_YEAR: 'Нельзя копировать год сам в себя',
    INVALID_YEAR: 'Некорректный год',
    INVALID_STATUS: 'Некорректный статус',
    NEWS_NOT_FOUND: 'Новость не найдена на repost.uz',
    INVALID_ID: 'Некорректный идентификатор',
    VALIDATION_ERROR: 'Проверьте заполнение полей',
};

export const errorCode = e => e?.response?.data?.code || e?.response?.data?.message || null;

export const errorMessage = e => {
    const d = e?.response?.data;
    const code = d?.code;
    if (code === 'NOMINATION_HAS_VOTES') return `В номинации уже есть голоса (${d?.votes ?? '?'}) — удаление запрещено`;
    if (code && CODES[code]) return CODES[code];
    if (e?.response?.status === 409 && !code) return 'Конфликт: такая запись уже существует';
    if (e?.response?.status === 401) return 'Сессия истекла — войдите снова';
    if (!e?.response && e?.message === 'Network Error') return 'Нет соединения с сервером';
    return d?.message || code || e?.message || 'Неизвестная ошибка';
};
