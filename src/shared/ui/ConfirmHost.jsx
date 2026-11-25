'use client';
import {AlertTriangle, HelpCircle} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import {useConfirmStore} from './confirm';

export default function ConfirmHost() {
    const {request, close} = useConfirmStore();
    const done = v => { request?.resolve(v); close(); };
    const danger = request?.tone === 'danger';
    return (
        <Modal open={!!request} onClose={() => done(false)} size="sm" tone={danger ? 'danger' : 'default'}
               icon={request?.icon ?? (danger ? AlertTriangle : HelpCircle)}
               title={request?.title} description={request?.description}
               footer={<>
                   <Button variant="secondary" onClick={() => done(false)}>{request?.cancelText ?? 'Отмена'}</Button>
                   <Button data-autofocus variant={danger ? 'danger' : 'dark'} onClick={() => done(true)}>
                       {request?.confirmText ?? 'Подтвердить'}
                   </Button>
               </>}>
            {request?.body ?? null}
        </Modal>
    );
}
