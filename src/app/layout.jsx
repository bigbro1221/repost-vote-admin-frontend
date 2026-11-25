import './globals.css'
import localFont from 'next/font/local'
import SignInController from '@/features/sign-in/controllers/sign-in-controller';
import InitApi from './InitApi';
import AppShell from '@/widgets/layout/ui/AppShell';
import Toaster from '@/shared/ui/Toaster';
import ConfirmHost from '@/shared/ui/ConfirmHost';

// Official unhinted web build (Inter 4.1) — the hinted desktop TTFs make т/м look shrunken on Windows.
const inter = localFont({
    src: [
        {path: './fonts/InterDisplay-Regular.woff2', weight: '400', style: 'normal'},
        {path: './fonts/InterDisplay-Medium.woff2', weight: '500', style: 'normal'},
        {path: './fonts/InterDisplay-SemiBold.woff2', weight: '600', style: 'normal'},
        {path: './fonts/InterDisplay-Bold.woff2', weight: '700', style: 'normal'},
    ],
    variable: '--font-sans',
    display: 'swap',
})

export const metadata = {
    title: 'Народный рейтинг · Админ',
    description: 'Repost · Народный рейтинг — панель управления'
}

export default function RootLayout({children}) {
    return (
        <html lang="ru" className={inter.variable}>
            <body className="font-sans">
                <SignInController />
                <InitApi />
                <AppShell>{children}</AppShell>
                <Toaster />
                <ConfirmHost />
            </body>
        </html>
    )
}
