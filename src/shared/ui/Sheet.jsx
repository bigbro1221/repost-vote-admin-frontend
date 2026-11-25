'use client';
import {useRef} from 'react';
import {createPortal} from 'react-dom';
import classNames from 'classnames';
import {useOverlay} from './overlay';

// Right-side drawer. Children control their own header/body/footer layout.
const Sheet = ({open, onClose, children, className}) => {
    const panelRef = useRef(null);
    useOverlay(open, onClose, panelRef);
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div className="fixed inset-0 z-50" role="presentation">
            <div className="absolute inset-0 animate-fade-in bg-zinc-950/30 backdrop-blur-[2px]" onClick={onClose}/>
            <div ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}
                 className={classNames('absolute inset-y-0 right-0 flex w-full max-w-[680px] animate-slide-in-right flex-col bg-white shadow-pop outline-none sm:rounded-l-2xl', className)}>
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default Sheet;
