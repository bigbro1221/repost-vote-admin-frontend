import {Suspense} from 'react';
import NominationsWorkspace from '@/widgets/nominations/ui/NominationsWorkspace';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <NominationsWorkspace/>
        </Suspense>
    );
}
